<?php
namespace White;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class White implements MessageComponentInterface {

    protected $clients;
    private $lists;
    private $listUsers;
    private $users;
    private $db;
    private $dbLists;
    private $dbMessages;
    private $moreMessagesLimit = 20;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->users = array();
        foreach ($this->users as $k=>$v) {
            unset($this->users[$k]);
        }
        unset($this->lists);
        unset($this->listUsers);
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $json = json_decode($msg);

        if ($json->a === "login") {

            // Handle login
            $this->handleLogin($from, $json, $msg);

            return;

        } else if ($json->a === "message") {

            // Handle sending messages.
            $this->handleMessage($from, $json);

            return;
        }
    }

    public function handleLogin($from, $json, $msg) {
        $this->setUsers($from, $from->resourceId);

        $response = array("status"=>"ok", "a"=>"login", "isLoggedIn"=>true);
        $from->send(json_encode($response));

        $this->setList($from, $json->list);
        $this->setUsername($from, $from->resourceId);
        $this->listUsers[$json->list][$from->resourceId] = $from->resourceId;

        foreach ($this->clients as $client) {
            if ($from !== $client 
                    // Ensure message is sent to the proper list.
                    && $this->getList($from) === $this->getList($client)) {
                $o = array("status"=>"ok", "a"=>"message", "t"=>"status-message", 
                        "statusType"=>"join", "username"=>$from->resourceId);
                $client->send(json_encode($o));
            }
        }
    }

    function handleMessage($from, $json, $t=null) {
        if (!isset($t)) {
            $t = "message";
        }

        $fromUsername = $this->getUsername($from);
        foreach ($this->clients as $client) {
            // Don't send message to the sender.
            if ($from !== $client 
                    // Ensure message is sent to the proper list.
                    && $this->getList($from) === $this->getList($client)) {
                $json->status = "ok";
                $json->action = $json->actiontype;
                $json->from = $fromUsername;
                $client->send(json_encode($json));
            }
        }
    }

    public function logout($client) {
        $list = $this->getList($client);
        $username = $this->getUsername($client);

        if (isset($list) && isset($username)) {
            foreach ($this->clients as $theClient) {
                $o = array("status"=>"ok", "a"=>"message", "t"=>"status-message",
                        "statusType"=>"disconnect", "username"=>$username,
                        "msg"=>"<span style=\"color:red;\">@" 
                        . $username . " disconnected</span> <span class=\"timestamp\">" 
                        . date("Y-m-d H:i:s") . "</span>");
                if ($this->getList($theClient) === $list) {
                    $theClient->send(json_encode($o));
                }
            }
        }

        $this->removeFromUsers($username);
        $this->unsetListUserClient($client);
        $this->clients->detach($client);
    }

    public function onClose(ConnectionInterface $conn) {
        $this->logout($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->logout($conn);
        $conn->close();
    }

    public function getList($client) {
        return $this->lists[$client->resourceId]['list'];
    }

    public function setList($client, $list) {
        $this->lists[$client->resourceId]['list'] = $list;
    }

    public function getUsername($client) {
        return $this->lists[$client->resourceId]['username'];
    }

    public function setUsername($client, $username) {
        $this->lists[$client->resourceId]['username'] = $username;
    }

    public function unsetListUserClient($client) {
        $key = false;
        if (isset($this->listUsers)) {
            if (is_array($this->listUsers[$this->getList($client)])) {
                $key = array_search($this->getUsername($client), 
                        $this->listUsers[$this->getList($client)]);
            }
        }
        if ($key) {
            if (isset($this->listUsers)) {
                unset($this->listUsers[$this->lists[$client->resourceId]['list']][$key]);
            }
            if (isset($this->lists)) {
                unset($this->lists[$client->resourceId]);
            }
        }
    }

    public function setUsers($client, $username) {
        $this->users[$client->resourceId] = $username;
    }

    public function getUsers() {
        return $this->users;
    }

    public function removeFromUsers($username) {
        $key = array_search($username, $this->users);
        if ($key) {
            unset($this->users[$key]);
        }
    }

    /**
     * This prevents the user from logging into a list from the same browser.
     */
    public function isLoggedIn($username) {
        if (in_array($username, $this->users)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * This function should match that in talk2me.js
     */
    public function getUserLockHTML() {
        return "<span class=\"glyphicon glyphicon-lock btn-tooltip\" title=\"This users messages are encrypted.\"></span>";
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

}
