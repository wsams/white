<?php

require_once("../vendor/autoload.php");
require_once("../bin/config.php");
require_once("../lib/white.php");

date_default_timezone_set($cfg['timezone']);

$mongo = new Mongo($cfg['mongoHost']);
$w = new White($mongo, $cfg);

session_start();
$sessid = session_id();

function response($arr) {
    print(json_encode($arr));
}

function responseByStatus($arr, $status, $app) {
    $app->response->setStatus($status);
    response($arr);
}

$app = new \Slim\Slim();

$app->response()->header("Content-Type", "application/json");

$app->get('/services/load-all/:secret', function ($secret) use ($cfg, $mongo, $w, $app) {
    if ($w->isValid($secret, $cfg['secret'])) {
        response(array("msg" => "All items returned successfully.", "items" => $w->getAllLists()));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

// Loads all items from list
$app->get('/services/load/:list/:secret', function ($list, $secret) use ($cfg, $mongo, $w, $app) {
    if ($w->isValid($secret, $cfg['secret'])) {
        response(array("msg" => "All items returned successfully.", "items" => $w->getList($list)));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

// Loads a single list item
$app->get('/services/load/:list/:id/:secret', function ($list, $id, $secret) use ($cfg, $mongo, $w, $app) {
    if ($w->isValid($secret, $cfg['secret'])) {
        response(array("msg" => "All items returned successfully.", "items" => $w->getListItem($id, $list)));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

$app->get('/services/sort/:direction/type/:type/sort/:direction2/type/:type2/list/:list/:secret', 
        function ($direction, $type, $direction2, $type2,$list, $secret) use ($cfg, $mongo, $w, $app) {
    if ($w->isValid($secret, $cfg['secret'])) {
        response(array("msg" => "All items returned successfully.", "items" => $w->getListByOrder($list, $direction, $type, $direction2, $type2)));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

$app->get('/services/search/:q/:secret', function ($q, $secret) use ($cfg, $mongo, $w, $app) {
    if ($w->isValid($secret, $cfg['secret'])) {
        response(array("msg" => "Search returned successfully.", "items" => $w->search($q)));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

$app->post('/services/save/:list/:id/:done/:secret', function ($list, $id, $done, $secret) use ($cfg, $mongo, $app, $w) {
    if ($w->isValid($secret, $cfg['secret'])) {
        $text = $app->request()->post("text");
        $props = $w->saveListItem($list, $id, $done, $text);
        response(array("msg" => "Saved item.", "id" => $props['id'], "labels" => $props['labels'], "priority" => $props['priority']));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

$app->get('/services/delete/:id/:secret', function ($id, $secret) use ($cfg, $mongo, $w, $app) {
    if ($w->isValid($secret, $cfg['secret'])) {
        $w->deleteListItem($id);
        response(array("msg" => "Deleted item."));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

$app->get('/services/strike/:id/:strike/:secret', function ($id, $strike, $secret) use ($cfg, $mongo, $w, $app) {
    if ($w->isValid($secret, $cfg['secret'])) {
        $w->strikeListItem($id, $strike);
        response(array("msg" => "Striked item."));
    } else {
        responseByStatus(array("msg" => "Please authenticate first."), 403, $app);
    }
});

$app->run();
