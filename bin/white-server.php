<?php

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use White\White;

require dirname(__DIR__) . "/vendor/autoload.php";
require dirname(__DIR__) . "/bin/config.php";

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new White()
        )
    ),
    $cfg['webSocketPort']
);

$server->run();
