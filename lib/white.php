<?php

class White {

    private $mongo;
    private $cfg;

    public function __construct($mongo, $cfg) {
        $this->mongo = $mongo;
        $this->cfg = $cfg;
    }

    public function getTime() {
        return date("Y-m-d H:i:s") . microtime();
    }

    public function toHtmlId($mongoId) {
        return "wt" . $mongoId;
    }

    public function toMongoId($htmlId) {
        return ltrim($htmlId, "wt");
    }

    public function isValid($secret, $realSecret) {
        return $secret === $realSecret;
    }

    public function parseForAt($due) {
        return date("H:i n/j/Y", strtotime(trim($due)));
    }

    public function remind($due, $text) {
        if ($this->cfg['enable-due']) {
            $due = $this->parseForAt($due);
            $message = preg_replace("/\"/", "\\\"", trim($text));
            $message = preg_replace("/\r|\n/", "", $message);
            $messageTruncated = strlen($message) > $this->cfg['due-truncate-subject-at'] 
                ? substr($message, 0, $this->cfg['due-truncate-subject-at']) . "..." : $message;
            $rand = sha1(microtime() . date("U") . time() . $due);
            if (!file_exists("../jobs")) {
                mkdir("../jobs");
            }
            foreach ($this->cfg['due-to'] as $email) {
                file_put_contents("../jobs/{$rand}", "echo \"{$message}\" | "
                    . "mail -a \"From: {$this->cfg['due-from']}\" -s "
                    . "\"{$this->cfg['due-subject-prefix']} {$messageTruncated}\" {$email}\n", FILE_APPEND);
            }
            $cmd = "sudo at {$due} -f ../jobs/{$rand}";
            exec($cmd);
        }
    }

    public function getAllLists() {
        $items = $this->mongo->{$this->cfg['mongoDatabase']}->items;

        $lists = array();
        if ($this->cfg['list-sort-order'] === "ascending") {
            // Simple return a sorted list
            $lists = $items->distinct("list");
            sort($lists, SORT_NATURAL);
        } else if ($this->cfg['list-sort-order'] === "last-modified") {
            // Return list in descending order by last modified
            $mr = $items->find()->sort(array("timestamp" => -1));
            $lists = array();
            while ($mr->hasNext()) {
                $lists[] = $mr->getNext()['list'];
            }
            $lists = array_unique($lists);
        } else {
            // Simple return a sorted list
            $lists = $items->distinct("list");
            sort($lists, SORT_NATURAL);
        }

        return $lists;
    }

    public function getList($list, $direction=null, $type=null, $direction2=null, $type2=null) {
        $items = $this->mongo->{$this->cfg['mongoDatabase']}->items;
        $data = array("list" => $list, "deleted" => false);
        if (is_null($direction) && is_null($type)) {
            $sort = array("strike" => 1, "timestamp" => -1, "priority" => 1);
        } else {
            // sort order 1
            $negative = false;
            if (preg_match("/-/", $direction)) {
                $negative = true;
            }
            if ($negative) {
                $direction = -1;
            } else {
                $direction = 1;
            }

            // sort order 2
            $negative = false;
            if (preg_match("/-/", $direction2)) {
                $negative = true;
            }
            if ($negative) {
                $direction2 = -1;
            } else {
                $direction2 = 1;
            }

            $sort = array("strike" => 1, $type => $direction, $type2 => $direction2);
        }
        $mr = $items->find($data)->sort($sort);
        $items = array();
        while ($mr->hasNext()) {
            $item = $mr->getNext();
            $timestamp = preg_replace("/^([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}).*$/", "\${1}", $item['timestamp']);
            $display_timestamp = date($this->cfg['date-format'], strtotime($timestamp));
            $items[] = array("id" => $this->toHtmlId($item['_id']->{'$id'}), "text" => $item['text'], 
                "strike" => $item['strike'], "labels" => $item['labels'], "priority" => $item['priority'], 
                "due" => $item['due'], "timestamp" => $display_timestamp);
        }
        return $items;
    }

    public function getListByOrder($list, $direction, $type, $direction2, $type2) {
        return $this->getList($list, $direction, $type, $direction2, $type2);
    }

    public function getListItem($id, $list) {
        $items = $this->mongo->{$this->cfg['mongoDatabase']}->items;
        $data = array("_id" => new MongoId($this->toMongoId($id)), "list" => $list, "deleted" => false);
        $mr = $items->find($data)->sort(array("strike" => 1, "timestamp" => -1, "priority" => 1));
        $items = array();
        while ($mr->hasNext()) {
            $item = $mr->getNext();
            $timestamp = preg_replace("/^([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}).*$/", "\${1}", $item['timestamp']);
            $display_timestamp = date($this->cfg['date-format'], strtotime($timestamp));
            $items[] = array("id" => $this->toHtmlId($item['_id']->{'$id'}), "text" => $item['text'], 
                "strike" => $item['strike'], "labels" => $item['labels'], "priority" => $item['priority'], 
                "due" => $item['due'], "timestamp" => $display_timestamp);
        }
        return $items;
    }

    public function search($q) {
        $items = $this->mongo->{$this->cfg['mongoDatabase']}->items;
        $data = array('$or' => array(
            array("text" => array('$regex' => $q, '$options' => "i"), "deleted" => false),
            array("labels" => $q, "deleted" => false),
            array("priority" => $q, "deleted" => false),
            array("due" => $q, "deleted" => false)
        ));
        //$mr = $items->find($data)->sort(array("strike" => 1, "priority" => 1, "timestamp" => 1));
        $mr = $items->find($data)->sort(array("strike" => 1, "priority" => -1));
        $items = array();
        while ($mr->hasNext()) {
            $item = $mr->getNext();
            $items[] = array("id" => $this->toHtmlId($item['_id']->{'$id'}), "text" => "#{$item['list']} " . $item['text'], 
                "strike" => $item['strike'], "labels" => $item['labels'], "priority" => $item['priority'], 
                "due" => $item['due']);
        }
        return $items;
    }

    public function saveListItem($list, $id, $done, $text) {
        // start: process text
        // Get reminder using strtotime() syntax (e.g. @<Friday 5pm> or @(Friday 5pm))
        preg_match("/([^\\\])?(@[<\(]\s*)(.*?)(\s*[>\)])/", $text, $m);
        $due = isset($m[3]) ? $m[3] : "";
        $text = count($m) > 0 ? str_replace($m[0], $m[1] . ($this->parseForAt($due)), $text) : $text;
        $done = $done === true || $done === "true" ? true : false;
        if ($done) {
            $this->remind($due, $text);
        }

        // Get label (e.g. #label)
        preg_match_all("/[^\\\]?#([a-zA-Z0-9-_]+)/", $text, $m);
        $labels = count($m) > 0 ? $m[1] : array();

        // Get priority (e.g. !10)
        preg_match("/[^\\\]?!([0-9]+)/", $text, $m);
        $priority = count($m) > 0 ? $m[1] : 0;
        // end: process text

        $items = $this->mongo->{$this->cfg['mongoDatabase']}->items;
        $data = array("text" => $text, "list" => $list, "labels" => $labels,
                "priority" => $priority, "due" => $due, "timestamp" => $this->getTime());
        if ($id === null || $id === "null") {
            // This handles a new item.
            $data['strike'] = false;
            $data['deleted'] = false;
            $items->insert($data);
            $id = $this->toHtmlId($data['_id']->{'$id'});
        } else {
            // This handles an update.
            //$mongoId = new \MongoDB\BSON\ObjectID($this->toMongoId($id));
            $mongoId = new MongoId($this->toMongoId($id));
            $items->update(array("_id" => $mongoId), array('$set' => $data));
        }
        return array("labels" => $labels, "priority" => $priority, "id" => $id);
    }

    public function deleteListItem($id) {
        $items = $this->mongo->{$this->cfg['mongoDatabase']}->items;
        $mongoId = new MongoId($this->toMongoId($id));
        $items->update(array("_id" => $mongoId), array('$set' => array("deleted" => true)));
        // Uncomment this if you want to remove the item completely.
        //$items->remove(array("_id" => $mongoId));
    }

    public function strikeListItem($id, $strike) {
        $items = $this->mongo->{$this->cfg['mongoDatabase']}->items;
        $strike = $strike === true || $strike === "true" ? true : false;
        $mongoId = new MongoId($this->toMongoId($id));
        $items->update(array("_id" => $mongoId), array('$set' => array("strike" => $strike)));
    }

}
