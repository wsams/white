<!DOCTYPE html>
<!--<html manifest="cache.manifest">-->
<html>
    <head>
        <meta charset="utf-8" />
        <title>White</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="shortcut icon" href="favicon.ico" />
        <link type="text/css" rel="stylesheet" href="js/bootstrap/release/css/bootstrap.min.css" />
        <link type="text/css" rel="stylesheet" href="css/simple-sidebar.css" />
        <link type="text/css" rel="stylesheet" href="css/white.css" />
        <link type="text/css" rel="stylesheet" href="css/font-awesome/css/font-awesome.min.css" />
    </head>
    <body>
        <div class="pull-left burger"><span class="glyphicon glyphicon-menu-hamburger menu-toggle"></span></div>
        <div id="wrapper" class="toggled">
            <div id="sidebar-wrapper">
                <ul class="sidebar-nav">
                    <li>
                        <div class="pull-right burger"><span class="glyphicon glyphicon-menu-hamburger menu-toggle"></span></div>
                    </li>
                    <li class="sidebar-brand">
                        <h1><a class="lists-link" href="#"><code>white</code></a></h1>
                    </li>
                    <li class="search-input-list-item">
                        <input type="text" style="width:90%;" class="form-control" id="q" placeholder="Search..." />
                    </li>
                </ul>
            </div>
            <div class="container page-content-wrapper">
                <div class="wt-list-wrapper">
                    <div class="wt-list">
                        <div id="wt-list-item-0" class="wt-list-item-first" data-id="0">
                            <input class="wt-list-item-input" type="text" id="wt-list-item-input-0" data-id="0" placeholder="Enter new item here" /> 
                            <div id="wt-list-item-sort" class="wt-list-item-no btn-group" data-id="sort" role="group">
                                <button class="active btn btn-xs btn-default sort-box sort-direction sort-asc btn-tooltip"
                                        title="Sort ascending">
                                    <i class="fa fa-sort-amount-asc"></i>
                                </button>
                                <button class="active sort-box sort-alpha sort-type btn btn-xs btn-primary btn-tooltip"
                                        title="Sort alpha/numeric">
                                    <i class="fa fa-book"></i>
                                </button>
                                <button class="sort-box sort-label sort-type btn btn-xs btn-primary btn-tooltip"
                                        title="Sort labels alpha/numeric">
                                    <i class="fa fa-hashtag"></i>
                                </button>
                                <button class="sort-box sort-priority sort-type btn btn-xs btn-primary btn-tooltip"
                                        title="Sort by priority">
                                    <i class="fa fa-exclamation"></i>
                                </button>
                                <button class="sort-box sort-time sort-type btn btn-xs btn-primary btn-tooltip"
                                        title="Sort by timestamp">
                                    <i class="fa fa-clock-o"></i>
                                </button>
                                <button class="btn btn-xs btn-default sort-box sort-direction sort-desc btn-tooltip"
                                        title="Sort descending">
                                    <i class="fa fa-sort-amount-desc"></i>
                                </button>
                            </div>
                            <div id="wt-list-item-sort" class="wt-list-item-no btn-group" data-id="sort" role="group">
                                <button class="btn btn-xs btn-default sort-box sort-direction-2 sort-asc-2 btn-tooltip"
                                        title="Sort ascending">
                                    <i class="fa fa-sort-amount-asc"></i>
                                </button>
                                <button class="sort-box sort-alpha-2 sort-type-2 btn btn-xs btn-primary btn-tooltip"
                                        title="Sort alpha/numeric">
                                    <i class="fa fa-book"></i>
                                </button>
                                <button class="sort-box sort-label-2 sort-type-2 btn btn-xs btn-primary btn-tooltip"
                                        title="Sort labels alpha/numeric">
                                    <i class="fa fa-hashtag"></i>
                                </button>
                                <button class="sort-box sort-priority-2 sort-type-2 btn btn-xs btn-primary btn-tooltip"
                                        title="Sort by priority">
                                    <i class="fa fa-exclamation"></i>
                                </button>
                                <button class="sort-box sort-time-2 sort-type-2 btn btn-xs btn-primary btn-tooltip"
                                        title="Sort by timestamp">
                                    <i class="fa fa-clock-o"></i>
                                </button>
                                <button class="btn btn-xs btn-default sort-box sort-direction-2 sort-desc-2 btn-tooltip"
                                        title="Sort descending">
                                    <i class="fa fa-sort-amount-desc"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <script src="js/jquery.min.js"></script>
        <script src="js/bootstrap/release/js/bootstrap.min.js"></script>
        <script src="js/config.js"></script>
        <script src="js/Autolinker.min.js"></script>
        <script src="js/white.js"></script>
    </body>
</html>
