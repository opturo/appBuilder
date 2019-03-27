/**
 * Created by rocco on 5/23/2016.
 */
var odinFormBuilder = {
    /** The Field Types */
    DATE_ITERATOR_FIELD: 0,
    TEXT_FIELD: 1,
    PASSWORD_FIELD: 2,
    DATE_FIELD: 3,
    FILE_ONLY_FIELD: 4,
    FILE_PATH_FIELD: 5,
    DIRECTORY_FIELD: 6,
    DROP_DOWN_FIELD: 7,
    TREE_DROP_DOWN_FIELD: 8,
    CHECK_LIST_BOX_FIELD: 9,
    INTEGER_FIELD: 10,
    DOUBLE_FIELD: 11,
    LONG_TEXT_FIELD: 12,
    IMAGE_FIELD: 13,
    FILE_UPLOAD_FIELD: 14,
    COLOR_CHOOSER_FIELD: 15,

    /** The OutputTypes */
    OUTPUT_TYPE_NO_DISPLAY: -1,
    OUTPUT_TYPE_DATA_WINDOW: 1,
    OUTPUT_TYPE_FILE: 2,
    OUTPUT_TYPE_DASHBOARD: 3,
    OUTPUT_TYPE_TABLE_DESIGNER: 4,
    OUTPUT_TYPE_ENVISION: 5,

    STYLE: 'info',

    /** Variables */
    MAX_DROPDOWN_ELEMENTS: 1000,
    jobName: null,//Holds the job name if their is one.
    jobFriendlyName: null,//Holds the job name if their is one.
    isUseInternalJVMEnabled: false, //Holds whether internal jvm is being used.
    reportId: null,//Holds the report id of the last run process.
    tocHtml: "",//Contains the Table Of Contents Html
    processTreeData: null,//Holds the data for the report data (process tree)
    currentData: null,//Holds the current data for the process
    selectedImages: {},//Holds the image name of the previously selected image
    groupedVariables: {},//Holds the grouping grids if there are any.

    //For ODIN Lite
    odinLite_entityDir: null,
    odinLite_entityName: null,
    odinLite_overrideUser: null,

    /**
     * init
     * init ODIN :: Form Builder
     */
    init: function(){
        //Perform translation if needed.
        odin.performTranslation('.smallLoadingMessage');


        //Add a case insensitive contains selector to jquery. Used for Filtering Report Names
        $.extend($.expr[':'], {
            'containsi': function(elem, i, match, array)
            {
                return (elem.textContent || elem.innerText || '').toLowerCase()
                        .indexOf((match[3] || "").toLowerCase()) >= 0;
            }
        });


        //Add the loading message
        $('#smallLoadingMessage').show();

        //odinPerformance.setUserLoggedIn;
        odin.userIsLoggedIn(odinFormBuilder.setUserLoggedIn,function(){
            //Get the params
            //var params = via.getQueryParams();
            var queryString = "";
            var paramString = odin.getParameterString();
            if(!via.undef(paramString,true)){
                queryString += "&"+paramString;
            }
            window.location = '../index.jsp?referrer=./appBuilder/index.html' + queryString;
        });
    },

    /**
     * setUserLoggedIn
     * log the user into the ui
     */
    setUserLoggedIn: function(){
        //Perform translation if needed.
        odin.performTranslation('body');

        //Change the theme if needed
        via.changeThemeApplicationOptions(odin.getUserSpecificSetting("theme"));


        //Get the params
        var params = via.getQueryParams();

        //Logout Button Visible and Set Action
        if(via.undef(params['hidelogout'],true) || params['hidelogout'].toLowerCase()!=='true') {
            $('#odinLogoutButton').click(function () {
                //Log the user out
                odin.logoutUser(function(){
                    if(odinFormBuilder.isODINLiteUser()){
                        window.location = "../"+odin.ODIN_LITE_DIR+"/";
                    }
                },odinFormBuilder.isODINLiteUser());
            }).fadeIn();
        }else{
            $('.resultDivider').hide();
        }

        //Change reports button - check if it is set to true. This will hide the button.
        if(via.undef(params['hidereports'],true) || params['hidereports'].toLowerCase()!=='true') {
            $('#changeReportsButton').click(function () {
                odinFormBuilder.getChangeReportDialog();
            }).fadeIn();
        }

        //Account Button
        if(via.undef(params['hideaccount'],true) || params['hideaccount'].toLowerCase()!=='true') {
            $('#accountButton').click(function () {
                odinFormBuilder.loadAccountSettings();
            }).fadeIn();

            $('#accountSettings').load('../'+odin.ODIN_LITE_DIR+'/html/accountSettings.html',function() {
                odin.initAccountSettings(odinFormBuilder.isODINLiteUser());
            });
        }

        //Title
        if(!via.undef(params['title'],true)){
            $('.appTitle').html(params['title']);
            //Perform translation if needed.
            odin.performTranslation('.appTitle');
        }
        //Saved report - clear
        $('.savedReportName').empty();

        //Check the style
        if(!via.undef(params.style)){
            odinFormBuilder.STYLE = params.style;
        }

        //Assign an action to the back button
        $('#formBuilder_backButton').click(function(){
            $('#smallLoadingMessage').hide();
            $('#resultsPanel').hide();
            $('#mainPanel').fadeIn();
            $('#formBuilder_resultButtons').hide();
            $('.poweredPanel').fadeIn();
            //Show Admin Controls
            if(via.isDebug()){
                $(".adminControls").fadeIn();
            }
            if(!via.undef(odinFormBuilder.jobFriendlyName)){
                $('.appTitle').html(odinFormBuilder.jobFriendlyName);
                //Perform translation if needed.
                odin.performTranslation('.appTitle');
            }
        });


        //Assign an action to the log button
        $('#formBuilder_logButton').click(function(){
            odinFormBuilder.getLogFile();
        });

        //Assign an action to the show log button
        $('#formBuilder_showLogButton').click(function(){
            $('#formBuilder_showLogContainer').fadeIn();
            $('#formBuilder_showLogButton').hide();
        });

        //Assign action to terminate job button
        $('#formBuilder_terminateJobButton').click(function(){
            $('#formBuilder_terminateJobButton').prop( "disabled", true );
            odinFormBuilder.terminateJob();
        });


        //Job name not defined list the jobs.
        if(via.undef(params['jobname'],true)){
            //To setup for ODIN Lite
            odinFormBuilder.setupODINLiteUser(params.entityname,params.entitydir,params.appname,params.overrideuser,params.isfreeonlyuser);

            odinFormBuilder.getProcessTree();
        }
        //Job name is defined. Load the job
        else{
            //build the form
            odinFormBuilder.getJobFormBreakdown(params['jobname']);
        }

        //remove the loading message
        setTimeout(function() {
            $('#smallLoadingMessage').hide();
        },100);
    },

    /**
     * setupODINLiteUser
     * If the user is an ODIN Lite user then this will set them up.
     */
    setupODINLiteUser: function(entityName,entityDir,appName,overrideUser,isFreeOnlyUser){
        if(via.undef(entityName,true) || via.undef(entityDir,true)){
            return;
        }
        if(via.undef(appName,true)){
            via.alert("Not Initialized","Application not initialized. Entity not loaded.");
            return;
        }

        //Set the variables
        odinFormBuilder.odinLite_entityDir = entityDir;
        odinFormBuilder.odinLite_entityName = entityName;
        odinFormBuilder.odinLite_overrideUser = overrideUser;
        //odinFormBuilder.isFreeOnlyUser = isFreeOnlyUser;

        //Display the entity
        var overrideHtml = "";
        if(!via.undef(odinFormBuilder.odinLite_overrideUser,true)){
            overrideHtml = ',<span style="color:red;"> Override User:' + odinFormBuilder.odinLite_overrideUser + "</span>";
        }
        $('.appTitle').html(appName + " <i><small>(Entity: " + odinFormBuilder.odinLite_entityName + overrideHtml + ")</small></i>");

        //Add the home button that leads back to odin lite
        $("#mainNavbar .navbar-left").prepend('<a title="Home"  id="odinLiteHomeButton" class="tr btn navbar-btn btn-default" href="#"><i class="fa fa-home"></i></a>');
        $("#odinLiteHomeButton").on('click',function(){
            window.location = "../"+odin.ODIN_LITE_DIR+"/?entityDir="+entityDir+"&entityName="+entityName+"&overrideUser="+(via.undef(odinFormBuilder.odinLite_overrideUser,true)?"":odinFormBuilder.odinLite_overrideUser);
        });

        //Hide the query string
        window.history.replaceState("From " + appName, "", "./");
    },


    /**
     * isODINLiteUser
     * if the user is an ODIN Lite user then this will set them up.
     */
    isODINLiteUser: function(){
        //check to see if no redirect.
        var noRedirect = via.getParamsValue("noredirect");
        if(!via.undef(noRedirect) && noRedirect.toLowerCase() === "true"){
            return false;
        }

        if(via.undef(odinFormBuilder.odinLite_entityDir,true) || via.undef(odinFormBuilder.odinLite_entityName,true)){
            return false;
        }
        return true;
    },

    /**
     * checkODINLiteRedirect
     * this redirects to odinLite if the dbdir and dnname are not present.
     */
    checkODINLiteRedirect: function(isODINLiteUser){
        //check to see if no redirect.
        var noRedirect = via.getParamsValue("noredirect");
        if(!via.undef(noRedirect) && noRedirect.toLowerCase() === "true"){
                return;
        }

        //Check if it is an Odin Lite user
        if(!via.undef(isODINLiteUser,true) && isODINLiteUser === true){

            if(!odinFormBuilder.isODINLiteUser()){
                window.location = "../"+odin.ODIN_LITE_DIR+"/"
            }
        }
    },

    /**
     * getKendoTreeData
     * format the tree data for the kendo data store
     */
    getKendoTreeData: function(data){
        var kendoTreeData = [];
        for(var i=0;i<data.length;i++) {
            var node = data[i];
            kendoTreeData = renameChildren(kendoTreeData,node,true);
        }
        return kendoTreeData;

        //Recursive function. All it does it rename children to items.
        function renameChildren(kendoTreeData,node,isRoot){
            //Recursive - If it has children call this method again.
            if(!via.undef(node.children) && node.children.length > 0 ){
                for(var i=0;i<node.children.length;i++){
                    var childNode = node.children[i];
                    kendoTreeData = renameChildren(kendoTreeData,childNode,false);
                }
                node.items = node.children;
                node.children = null;
                delete node.children;
            }
            if(isRoot === true){
                kendoTreeData.push(node);
            }
            return kendoTreeData;
        }
    },

    /**
     * getChangeReportDialog
     * launches the report dialog
     */
    getChangeReportDialog: function(){
        //Dont launch more than once.
        if($('#changeReportDialog').length){
            return;
        }

        //Get the data if they
        kendo.ui.progress($("body"), true);
        if(via.undef(odinFormBuilder.processTreeData)){
            odinFormBuilder.getProcessTreeFromServer(makeReportWindow);
        }else{
            makeReportWindow(odinFormBuilder.processTreeData);
        }

        function makeReportWindow(reportTreeData){
            //Get the data in the correct format.
            var data = JSON.parse(JSON.stringify(reportTreeData.data.CONFIG_TREE_LIST));
            var kendoTreeData = odinFormBuilder.getKendoTreeData(data);
            //End - Get data

            //Create the Data Source
            var processDataSource = new kendo.data.HierarchicalDataSource({
                sort: { field: "text", dir: "asc" },
                data: kendoTreeData
            });

            //Remove the div if it is there if not add it.
            $('#changeReportDialog').remove();
            $('body').append('<div id="changeReportDialog" style="overflow:hidden;">' +
                '<div class="dialogContent">' +
                '<span class="form-inline">' +
                '<input id="changeReport_filterText" type="text" class="tr form-control" placeholder="Report Filter" style="width:230px"/>' +
                '<a style="margin-left:8px;" title="Expand All"  id="expandReportsButton" class="tr btn navbar-btn btn-default" href="#"><i class="fa fa-plus"></i></a> ' +
                '<a style="margin-right:5px;" title="Collapse All"  id="collapseReportsButton" class="tr btn navbar-btn btn-default" href="#"><i class="fa fa-minus"></i></a> ' +
                '</span>' +
                '<div id="changeReport_treeview" style="height:420px;user-select: none;"></div>' +
                '</div>' +
                '</div>');

            //Make the tree
            $("#changeReport_treeview").kendoTreeView({
                dataSource: processDataSource,
                dataSpriteCssClassField: "iconCls",
                expand: function(e){
                    if ($("#changeReport_filterText").val() == "") {
                        $(e.node).find("li").show();
                    }
                }
            });

            //Create the Dialog
            var dialog = $('#changeReportDialog');
            dialog.kendoDialog({
                width: "400px",
                //minHeight: "400px",
                height: "600px",
                title: "Select a Report",
                visible: false,
                close: function(){
                    $('#changeReportDialog').remove();
                },
                actions: [
                    {
                        text: 'Cancel',
                        primary: false,
                        action: function(e){
                            e.sender.close();
                        }
                    },
                    {
                        text: 'Ok',
                        primary: true,
                        action: function(e){
                            itemSelected();
                        }
                    }
                ]
            }).data("kendoDialog").open();

            kendo.ui.progress($("body"), false);//Wait Off

            //Double click on the treeView
            $("#changeReport_treeview").data("kendoTreeView").items().each(function (i, el) {
                $(el).on("dblclick", function (event) {
                    itemSelected();
                });
            });

            function itemSelected(){
                var treeView = $("#changeReport_treeview").data("kendoTreeView");
                var selected = treeView.select();
                if(via.undef(selected)){return false;}
                var item = treeView.dataItem(selected);
                if(via.undef(item)){return false;}
                if(item.hasChildren){return false;}
                if(via.undef(item.value)){return false;}

                dialog.data("kendoDialog").close();

                odinFormBuilder.goToNewJob(item.value);
            }

            //Perform translation if needed.
            odin.performTranslation('#changeReportDialog',["Select a Report","Ok","Cancel"],
                function(){//Success Function
                    var kendoDialog = dialog.data("kendoDialog")
                    if(!via.undef(odin.englishToLocalMap["Select a Report"])) {
                        kendoDialog.title(odin.englishToLocalMap["Select a Report"]);
                    }
                    if(!via.undef(odin.englishToLocalMap["Ok"])) {
                        $("button:contains('Ok')").text(odin.englishToLocalMap["Ok"]);
                    }
                    if(!via.undef(odin.englishToLocalMap["Cancel"])) {
                        $("button:contains('Cancel')").text(odin.englishToLocalMap["Cancel"]);
                    }
                });
            //End Translation

            //Expand and Collapse Tree
            $('#expandReportsButton').click(function(){
                var treeview = $("#changeReport_treeview").data("kendoTreeView");
                treeview.expand(".k-item");
            });
            $('#collapseReportsButton').click(function(){
                var treeview = $("#changeReport_treeview").data("kendoTreeView");
                treeview.collapse(".k-item");
            });

            $("#changeReport_filterText").keyup(function (e) {
                var changeReport_filterText = $(this).val();

                if (changeReport_filterText !== "") {
                    $("#changeReport_treeview .k-group .k-group .k-in").closest("li").hide();
                    $("#changeReport_treeview .k-group").closest("li").hide();
                    $("#changeReport_treeview .k-group .k-group .k-in:containsi(" + changeReport_filterText + ")").each(function () {
                        $(this).parents("ul, li").each(function () {
                            var treeView = $("#changeReport_treeview").data("kendoTreeView");
                            treeView.expand($(this).parents("li"));
                            $(this).show();
                        });
                    });
                    $("#changeReport_treeview .k-group .k-in:contains(" + changeReport_filterText + ")").each(function () {
                        $(this).parents("ul, li").each(function () {
                            $(this).show();
                        });
                    });
                }
                else {
                    $("#changeReport_treeview .k-group").find("li").show();
                    var nodes = $("#changeReport_treeview > .k-group > li");

                    $.each(nodes, function (i, val) {
                        if (nodes[i].getAttribute("data-expanded") == null) {
                            $(nodes[i]).find("li").hide();
                        }
                    });
                }
            });
        }

    },

    goToNewJob: function(jobKey){
        //Take care of account settings
        $('#accountSettings').hide();
        $('#accountButton_back').hide();
        $('#accountButton').show();

        //Saved report - clear
        $('.savedReportName').empty();

        var params = via.getQueryParams();
        params.jobname = jobKey;
        var queryString = "";
        $.each(params,function(key,value){
            queryString+=key+"="+value+"&";
        });
        if(queryString.match(/&$/)){queryString=queryString.substring(0,queryString.length-1)}
        var url = location.href;
        var idx = url.indexOf("?");
        url = url.substring(0,idx);
        url = url + "?" + queryString;


        //window.location = url; //Older way to switch jobs.

        //Update the link to the page.
        if (history.pushState) {
            //var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?myNewUrlQuery=1';
            window.history.pushState({path:url},'',url);
        }
        //Call the job form breakdown.
        odinFormBuilder.getJobFormBreakdown(jobKey);
    },

    getOutputTypeDisplay: function(outputInt){
        switch(outputInt){
            case odinFormBuilder.OUTPUT_TYPE_DATA_WINDOW:
                return "Data Window";
            case odinFormBuilder.OUTPUT_TYPE_DASHBOARD:
                return "Dashboard";
            case odinFormBuilder.OUTPUT_TYPE_ENVISION:
                return "Envision";
            case odinFormBuilder.OUTPUT_TYPE_FILE:
                return "File";
            case odinFormBuilder.OUTPUT_TYPE_NO_DISPLAY:
                return "No Display";
            case odinFormBuilder.OUTPUT_TYPE_TABLE_DESIGNER:
                return "Table Designer";
        }
    },

    /**
     * getUserGroups
     * this method get the current user groups for the user
     */
    getUserGroups: function(){
        //Call to the server to get the job info
        $.post(odin.SERVLET_PATH,
            $.extend(via.getQueryParams(), {
                action: 'processmanager.getUserGroups',
                overrideUser: odinFormBuilder.odinLite_overrideUser
            }),
            function(data){
                if(!via.undef(data,true) && data.success === false){
                    via.debug("Get User Groups Failure:", data.message);
                    odin.alert("Get User Groups Error",data.message);
                }else{
                    via.debug("Get User Groups Successful:", data);
                    /*
                    if(via.undef(data.data.CONFIG_TREE_LIST) || data.data.CONFIG_TREE_LIST.length === 0){
                        odin.alert("Get Process Tree Error","No jobs defined for this user.");
                        return;
                    }

                    data.data.CONFIG_TREE_LIST.forEach(function(o){
                        var html = odinFormBuilder.buildProcessTree(o,data.data,0,0);
                        $('#mainPanel').append(html);
                    });

                    odinFormBuilder.tocHtml = '<div class="well">' +
                        odinFormBuilder.tocHtml +
                        '</div>';

                    $('#mainPanel').prepend(odinFormBuilder.tocHtml + "<hr/>");
                    */
                }
            },
            'json');
    },

    /**
     * getProcessTree
     * get the process tree for the current user
     */
    getProcessTree: function(callbackFn){
        //Call to the server to get the job info
        odinFormBuilder.getProcessTreeFromServer(function(data) {
            if (!via.undef(data, true) && data.success === false) {
                via.debug("Get Process Tree Failure:", data.message);
                odin.alert("Get Process Tree Error", data.message);
            } else {
                via.debug("Get Process Tree Successful:", data);
                if (via.undef(data.data.CONFIG_TREE_LIST) || data.data.CONFIG_TREE_LIST.length === 0) {
                    odin.alert("Get Process Tree Error", "No Reports found in your Profile.");
                    return;
                }

                $('#mainPanel').append('' +
                    '<div style="margin:5px;"  class="row">' +
                    '<div class="col-md-3 well">' +
                    '<div id="TOC_changeReportDialog">' +
                    '<div class="dialogContent">' +
                    '<span class="form-inline">' +
                    '<input id="TOC_changeReport_filterText" type="text" class="tr form-control" placeholder="Report Filter" style="width:230px"/>' +
                    '<a style="margin-left:8px;" title="Expand All"  id="TOC_expandReportsButton" class="tr btn navbar-btn btn-default" href="#"><i class="fa fa-plus"></i></a> ' +
                    '<a style="margin-right:5px;" title="Collapse All"  id="TOC_collapseReportsButton" class="tr btn navbar-btn btn-default" href="#"><i class="fa fa-minus"></i></a> ' +
                    '</span>' +
                    '<div id="TOCReport_treeview" style="height:500px;"></div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '<div id="jobDetailDisplay" class="col-md-9">' +
                    '<div class="tr well">Select a Report</div>' +
                    '</div>' +
                    '</div>');
                $('#TOCReport_treeview').css('height',$(window).height()-250 + "px");
                $( window ).resize(function() {
                    if($('#TOCReport_treeview').length) {
                        $('#TOCReport_treeview').css('height', $(window).height() - 250 + "px");
                    }
                });

                //Perform translation if needed.
                odin.performTranslation('#mainPanel');

                //Get the data in the correct format.
                var treeData = JSON.parse(JSON.stringify(data.data.CONFIG_TREE_LIST));
                var kendoTreeData = [];
                for(var i=0;i<treeData.length;i++) {
                    var node = treeData[i];
                    kendoTreeData = renameChildren(kendoTreeData,node,true);
                }
                function renameChildren(kendoTreeData,node,isRoot){//Recursive function. All it does it rename children to items.
                    //Recursive - If it has children call this method again.
                    if(!via.undef(node.children) && node.children.length > 0 ){
                        for(var i=0;i<node.children.length;i++){
                            var childNode = node.children[i];
                            kendoTreeData = renameChildren(kendoTreeData,childNode,false);
                        }
                        node.items = node.children;
                        node.children = null;
                        delete node.children;
                    }
                    if(isRoot === true){
                        kendoTreeData.push(node);
                    }
                    return kendoTreeData;
                }
                //End - Get data

                //Create the Data Source
                var processDataSource = new kendo.data.HierarchicalDataSource({
                    sort: { field: "text", dir: "asc" },
                    data: kendoTreeData
                });

                //Make the tree
                $("#TOCReport_treeview").kendoTreeView({
                    dataSource: processDataSource,
                    dataSpriteCssClassField: "iconCls",
                    expand: function(e){
                        if ($("#TOC_changeReport_filterText").val() == "") {
                            $(e.node).find("li").show();
                        }
                    },
                    change: function(e) {
                        var selected = this.select();
                        if(via.undef(selected)){return false;}
                        var item = this.dataItem(selected);
                        if(via.undef(item)){return false;}
                        if(item.hasChildren){return false;}
                        if(via.undef(item.value)){return false;}

                        //Build the job display
                        var obj = data.data.jobInfo[item.value];
                        var html = '<div class="list-group">' +
                            '<a href="javascript:odinFormBuilder.goToNewJob(\''+item.value+'\');" class="list-group-item">' +
                            //'<a href="javascript:window.location=\''+url+'\';" class="list-group-item">' +
                            '<h4 style="margin-top:5px;" class="list-group-item-heading tr">'+obj.name+'</h4>' +
                            '<p class="list-group-item-text">' +
                            //'<table>' +
                            //'<tr><th class="tr">Job Key:</th><td>' + item.value + '</td></tr>' +
                            //'<tr><th class="tr">Output Type: </th><td class="tr">' + odinFormBuilder.getOutputTypeDisplay(obj.outputType) + '</td></tr>' +
                            //'</table>' +
                            '<hr/>' +
                            obj.desc +
                            '</p>' +
                            '</a>' +
                            '</div>';
                        $('#jobDetailDisplay').empty();
                        $('#jobDetailDisplay').html(html);

                        //Perform translation if needed.
                        odin.performTranslation('#jobDetailDisplay');
                    }
                });

                //Expand and Collapse Tree
                $('#TOC_expandReportsButton').click(function(){
                    var treeview = $("#TOCReport_treeview").data("kendoTreeView");
                    treeview.expand(".k-item");
                });
                $('#TOC_collapseReportsButton').click(function(){
                    var treeview = $("#TOCReport_treeview").data("kendoTreeView");
                    treeview.collapse(".k-item");
                });

                $("#TOC_changeReport_filterText").keyup(function (e) {
                    var changeReport_filterText = $(this).val();

                    if (changeReport_filterText !== "") {
                        $("#TOCReport_treeview .k-group .k-group .k-in").closest("li").hide();
                        $("#TOCReport_treeview .k-group").closest("li").hide();
                        $("#TOCReport_treeview .k-group .k-group .k-in:containsi(" + changeReport_filterText + ")").each(function () {
                            $(this).parents("ul, li").each(function () {
                                var treeView = $("#TOCReport_treeview").data("kendoTreeView");
                                treeView.expand($(this).parents("li"));
                                $(this).show();
                            });
                        });
                        $("#TOCReport_treeview .k-group .k-in:contains(" + changeReport_filterText + ")").each(function () {
                            $(this).parents("ul, li").each(function () {
                                $(this).show();
                            });
                        });
                    }
                    else {
                        $("#TOCReport_treeview .k-group").find("li").show();
                        var nodes = $("#TOCReport_treeview > .k-group > li");

                    $.each(nodes, function (i, val) {
                        if (nodes[i].getAttribute("data-expanded") == null) {
                            $(nodes[i]).find("li").hide();
                        }
                    });
                }
                });


                //Bottom Section
                /*
                data.data.CONFIG_TREE_LIST.forEach(function (o) {
                    var html = odinFormBuilder.buildProcessTree(o, data.data, 0, 0);
                    $('#mainPanel').append(html);
                });
                */
                /*
                odinFormBuilder.tocHtml = '<div class="well">' +
                    odinFormBuilder.tocHtml +
                    '</div>';

                $('#mainPanel').prepend(odinFormBuilder.tocHtml + "<hr/>");
                */
                if(!via.undef(callbackFn)){
                    callbackFn(data);
                }
            }
        });
    },

    /**
     * getProcessTreeFromServer
     * get the process tree for the current user from the server. Calls the callback and saves the data so it can be reused.
     */
    getProcessTreeFromServer: function(callbackFn){
        //Call to the server to get the job info
        $.post(odin.SERVLET_PATH,
            $.extend(via.getQueryParams(), {
                action: 'processmanager.getProcessTreeAllInfo',
                reportId: odinFormBuilder.reportId,
                overrideUser: odinFormBuilder.odinLite_overrideUser
            }),
            function(data){
                if(!via.undef(data,true) && data.success === false){
                    via.debug("Get Process Tree Failure:", data.message);
                    odin.alert("Get Process Tree Error",data.message);
                    return;
                }
                odinFormBuilder.processTreeData = data;

                //Redirect to odin lite if dbdir is missing
                odinFormBuilder.checkODINLiteRedirect(data.data.isODINLiteUser);

                callbackFn(data);
            },
            'json');
    },

    buildProcessTree: function(obj,data,level, count){
        count++;
        var url = window.location.href.replace(/\?.*/,"");
        if(!via.undef(window.location.search,true)){
            url += window.location.search + '&jobName=' + obj.value;
        }else{
            url += '?jobName=' + obj.value;
        }
        url += '&USER='+ data.userName +'&ENTITY=' + data.entityCode +'&APIKEY=' + data.password;

        if(obj.leaf === true){
            var html = '<div class="list-group">' +
                    '<a name="C_'+via.cleanId(obj.text)+count+'" href="javascript:window.location=\''+url+'\';" class="list-group-item">' +
                        '<h4 class="list-group-item-heading">'+obj.text+'</h4>' +
                        '<p class="list-group-item-text">' +
                            '<table>' +
                                '<tr><th style="">Job Key:</th><td>' + obj.value + '</td></tr>' +
                                '<tr><th>Output Type: </th><td>' + odinFormBuilder.getOutputTypeDisplay(data.jobInfo[obj.value].outputType) + '</td></tr>' +
                                '<tr><th>Description: </th><td>' + obj.qtip + '</td></tr>' +
                                //'<tr><th>Embedded URL: </th><td>' + url  + '</td></tr>' +
                            '</table>' +
                        '</p>' +
                    '</a>' +
                '</div>';

            //Build the TOC - Leaf
            if(!via.undef(level)){
                text = '<a name="C_'+via.cleanId(obj.text)+count+'">' + obj.text + "</a>"
                for(var i=0;i<level+1;i++){
                    odinFormBuilder.tocHtml += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
                }//
                odinFormBuilder.tocHtml += '<a class="btn btn-default btn-sm" style="margin:1px;" href="#C_'+via.cleanId(obj.text)+count+'"><i class="fa fa-cog" aria-hidden="true"></i> '+obj.text+'</a> <br/>';
            }

            return html;
        }else {

            var text = obj.text;
            //Build the TOC - Folder
            //if(!via.undef(level) && level === 0){
            if(!via.undef(level)){
                text = '<a name="'+via.cleanId(obj.text)+count+'">' + obj.text + "</a>";
                for(var i=0;i<level+1;i++){
                    odinFormBuilder.tocHtml += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
                }


                if(level===0){
                    odinFormBuilder.tocHtml += '<i data-selector="container_'+via.cleanId(obj.text)+count+'" onclick="odinFormBuilder.toggleTOC(this);" class="fa fa-plus-square-o" aria-hidden="true"></i> <span class="btn btn-info btn-sm" style="margin:1px;"><a style="text-decoration:none;color:black;" href="#' + via.cleanId(obj.text) + count + '"><i class="fa fa-folder-open-o" aria-hidden="true"></i> ' + obj.text + '</a></span> <br/>';
                }else {
                    odinFormBuilder.tocHtml += '<span class="btn btn-info btn-sm" style="margin:1px;"><a style="text-decoration:none;color:black;" href="#' + via.cleanId(obj.text) + count + '"><i class="fa fa-folder-open-o" aria-hidden="true"></i> ' + obj.text + '</a></span> <br/>';
                }
            }

            var html = '<div class="panel panel-'+odinFormBuilder.STYLE+'">' +
                '<div class="panel-heading">' +
                '<h3 class="panel-title">' + text + '</h3>' +
                '</div>' +
                '<div class="panel-body">';

            if(level===0){
                odinFormBuilder.tocHtml += '<div style="display:none;" id="container_'+via.cleanId(obj.text)+count+'">';
            }

            if (!via.undef(obj.children) && obj.children != null) {
                obj.children.forEach(function (c) {
                    html += odinFormBuilder.buildProcessTree(c,data,level+1,count);
                });
            }

            if(level===0){
                odinFormBuilder.tocHtml += '</div>';
            }

            html += '</div>' +
                '</div>';

            if(level === 0){
                html += '<hr/>';
            }

            return html;
        }
    },

    /**
     * toggleTOC
     * show or hide the TOC subsection
     * @param id - The id to toggle
     */
    toggleTOC: function(o){
        $('#' + $(o).data('selector')).toggle();

        if($(o).hasClass('fa-plus-square-o')){
            $(o).removeClass('fa-plus-square-o');
            $(o).addClass('fa-minus-square-o');
        }else{
            $(o).removeClass('fa-minus-square-o');
            $(o).addClass('fa-plus-square-o');
        }
    },

    /**
     * getJobFormBreakdown
     * get the form breakdown for the job passed
     * @param jobName - The name of the job to get
     */
    getJobFormBreakdown: function(jobName){
        //Cleanup a previous run
        $('.poweredPanel').show();
        $('#resultsPanel').empty();
        $('#resultsPanel').hide();
        $('#formBuilder_resultButtons').hide();
        $('#mainPanel').fadeIn();

        //Show Admin Controls
        if(via.isDebug()){
            $(".adminControls").fadeIn();
        }

        odinFormBuilder.jobName = jobName;

        //Call to the server to get the job info
        $.post(odin.SERVLET_PATH,
            $.extend(via.getQueryParams(), {
                action: 'processmanager.getFormValues',
                processKey: jobName,
                entityDir: odinFormBuilder.odinLite_entityDir,
                overrideUser: odinFormBuilder.odinLite_overrideUser
            }),
            function(data, status){
                if(!via.undef(data,true) && data.success === false){
                    via.debug("Job Form Failure:", data.message);
                    odinFormBuilder.currentJobBreakdown = null;
                    odin.alert("Error",data.message);
                }else{
                    via.debug("Job Form Successful:", data);

                    //For dynamic dates
                    odinFormBuilder.dynamicDateComboData = data.data.dynamicDateComboData;
                    odinFormBuilder.dynamicDateExampleDate = data.data.dynamicDateExampleDate;

                    //Make sure the terminate button should be shown.
                    odinFormBuilder.isUseInternalJVMEnabled = data.data.isUseInternalJVMEnabled;
                    odinFormBuilder.reportOutputType = data.data.reportOutputType;

                    //Keep track of the variables.
                    odinFormBuilder.DYNAMIC_SETTING_LIST = data.data.DYNAMIC_SETTING_LIST;

                    //Max File Size
                    odinFormBuilder.MAX_FILE_SIZE = data.data.MAX_FILE_SIZE;

                    //Check odin lite variables.
                    odinFormBuilder.checkODINLiteRedirect(data.data.isODINLiteUser);

                    var variableList = data.data['DYNAMIC_SETTING_LIST'];
                    if(!via.undef(data.data['jobName'])) {
                        odinFormBuilder.jobFriendlyName = data.data['jobName'];
                        //Title
                        $('.appTitle').html(odinFormBuilder.jobFriendlyName);

                        //Perform translation if needed.
                        odin.performTranslation('.appTitle');
                    }

                    //Break into Groups//
                    var inTabSet = false;
                    var inOpenSet = false;
                    var sets = [];
                    var currIdx = [];
                    for(var i=0;i<variableList.length;i++){
                        var variable = variableList[i];
                        //It's an open field
                        if(via.undef(variable['tabName'])){
                            if(inTabSet === true){
                                inTabSet = false;
                                sets.push({
                                    type: 'tab',
                                    currIdx: currIdx
                                });
                                currIdx = [];
                            }
                            inOpenSet = true;
                            currIdx.push(i);
                        }
                        //It is a tab
                        else{
                            if(inOpenSet === true){
                                inOpenSet = false;
                                sets.push({
                                    type: 'open',
                                    currIdx: currIdx
                                });
                                currIdx = [];
                            }
                            inTabSet = true;
                            currIdx.push(i);
                        }
                    }
                    //Push the last set
                    if(inTabSet === true){
                        sets.push({
                            type: 'tab',
                            currIdx: currIdx
                        });
                    }else{
                        sets.push({
                            type: 'open',
                            currIdx: currIdx
                        });
                    }
                    //End - Break into Groups//

                    //Call to generate the HTML
                    var saveId = -1;
                    if(!via.undef(data.data.SAVE_ID)){ saveId = data.data.SAVE_ID; }
                    odinFormBuilder.getFormHtml(variableList, sets, saveId);


                    //Debug Detail and useExternalJVM
                    $("#useInternalJVMSwitch").kendoMobileSwitch({
                        checked: true,
                        change: function(e){
                            if(e.checked){
                                $("#debugDetail_div").hide();
                            }else{
                                $("#debugDetail_div").show();
                            }
                        }
                    });
                    $("#debugDetail").kendoSlider({
                        //orientation: "vertical",
                        min: 0,
                        max: 3,
                        smallStep: 1,
                        largeStep: 3,
                        showButtons: false
                    });
                    if(!via.undef(data.data.isUseInternalJVMEnabled) && data.data.isUseInternalJVMEnabled===false){
                        $("#useInternalJVMSwitch_div").hide();
                    }else{
                        $("#debugDetail_div").hide();
                    }

                    //Try to load default report
                    if(!via.undef(data.data.SAVE_ID)) {
                        via.loadDefaultReport(odin.PROCESS_MANAGER_APP_ID,data.data.SAVE_ID,function(json,reportName){
                            //Add the report name
                            $('.savedReportName').empty();
                            if(!via.undef(reportName,true)) {
                                $('.savedReportName').html("Report Setting: " + reportName);
                            }
                            //Load the settings
                            odinFormBuilder.loadReportSettings(json, variableList);
                        });
                    }
                }
            },
            'json');
    },

    /**
     * getFormHtml
     * This is
     * @param variables - The name of the job to get
     * @param sets - The sets of data to build html for
     */
    getFormHtml: function(variables,sets,saveId){

        //Loop through variables to see if there are groups.
        odinFormBuilder.groupedVariables = {};
        variables.forEach(function(e){
            if(!via.undef(e.groupName,true)){
                var groupName = e.groupName;
                if(via.undef(odinFormBuilder.groupedVariables[groupName])){
                    odinFormBuilder.groupedVariables[groupName] = [];
                }
                odinFormBuilder.groupedVariables[groupName].push(e);
            }
        });

        var html = "";
        for(var s=0;s<sets.length;s++){
            var setHtml = "";
            var set = sets[s];

            //Draw the tabs
            if(set.type === 'tab'){
                setHtml += '<ul class="nav nav-tabs nav-justified" role="tablist">\n';
                var tabs = [];
                var tabSets = {};
                var tabHtml = {};
                var firstTab = 'active';
                set.currIdx.forEach(function(e){
                    var tabName = variables[e].tabName;
                    if($.inArray(tabName,tabs) === -1){
                        setHtml += '\t<li role="presentation" class="'+firstTab+'"><a href="#'+via.cleanId(tabName)+'" aria-controls="'+via.cleanId(tabName)+'" role="tab" data-toggle="tab">'+tabName+'</a></li>\n';
                        tabs.push(tabName);
                        firstTab = '';
                    }
                    if(via.undef(tabSets[tabName])){
                        tabSets[tabName] = {
                            type: 'tab',
                            currIdx: [e] };
                    }else{
                        tabSets[tabName].currIdx.push(e);
                    }
                });

                //Populate the html for the inner tab
                tabs.forEach(function(e){
                    tabHtml[e] = odinFormBuilder.getFieldSetHtml(tabSets[e],variables);
                });

                setHtml += '</ul>\n' +
                    '<div class="tab-content">\n';
                firstTab = 'active';
                for (var key in tabHtml) {
                    if (tabHtml.hasOwnProperty(key)) {
                        setHtml += '<div role="tabpanel" class="tab-pane '+firstTab+'" id="'+via.cleanId(key)+'">' +
                            tabHtml[key] +
                        '</div>';

                        firstTab = '';
                    }
                }
                setHtml += '</div>';
            }
            //Draw the non tabs
            else{
                setHtml += odinFormBuilder.getFieldSetHtml(set,variables);
            }

            //add the set to the overall html
            html += setHtml;
        }

        var params = via.getQueryParams();

        //Add the form Controls
        var formHtml = '<form id="formBuilder_form" method="post" enctype="multipart/form-data;charset=UTF-8" accept-charset="UTF-8">' +
            '<input type="hidden" name="action" value="processmanager.runProcess"/>' +
            '<input type="hidden" name="processKey" value="'+odinFormBuilder.jobName+'"/>' +
            '<input type="hidden" name="debug" value="'+via.isDebug()+'"/>' +
            '<input type="hidden" name="USER" value="'+params.user+'"/>' +
            '<input type="hidden" name="ENTITY" value="'+params.entity+'"/>' +
            '<input type="hidden" name="entityDir" value="'+odinFormBuilder.odinLite_entityDir+'"/>' +
            '<input type="hidden" name="APIKEY" value="'+params.apikey+'"/>' +
            '<input id="formBuilder_reportId" type="hidden" name="reportId" value=""/>';

        if(variables.length === 0){
            html = formHtml + html +
                    '<div class="row">' +
                        '<div class="col-sm-12">' +
                            '<div class="text-center">' +
                                '<button type="submit" class="tr btn btn-primary">Generate Report</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</form>';
        }else{
            html = formHtml + html;

            //Saving and Loading Buttons.
            if(!via.undef(saveId) && saveId !== -1 && (odin.USER_INFO.isAdminUser===true || !odinFormBuilder.jobName.startsWith("DEMO_"))) {
                html +=
                    //Load
                    '<button type="button" id="loadSettingsButton" style="margin:10px 10px 10px 0;" title="Load Settings" class="tr btn btn-primary">' +
                    '<span class="glyphicon glyphicon-folder-open" aria-hidden="true"></span>' +
                    '</button>' +
                    //Save
                    '<button type="button" id="saveSettingsButton" style="margin:10px 10px 10px 0;" title="Save Settings" class="tr btn btn-primary">' +
                    '<span class="glyphicon glyphicon-floppy-disk" aria-hidden="true"></span>' +
                    '</button>';
            }
            //Generate Report Button
            html += '<button style="float:right;margin:10px 0 10px 0;" type="submit" class="tr btn btn-primary">Generate Report</button>' +
                '</form>';
        }
        //End - Add the form Controls

        $('#mainPanel').empty();
        $('#mainPanel').html(html);

        //Save and load setting buttons events.
        if(!via.undef(saveId) && saveId !== -1) {
            $('#loadSettingsButton').click(function(){
                via.loadWindow(odin.PROCESS_MANAGER_APP_ID,saveId,function(loadJson,reportName){
                    //Add the report name
                    $('.savedReportName').empty();
                    if(!via.undef(reportName,true)) {
                        $('.savedReportName').html("Report Setting: " + reportName);
                    }
                    //Load the json
                    odinFormBuilder.loadReportSettings(loadJson,variables);
                });
            });
            $('#saveSettingsButton').click(function(){
                var saveJson = odinFormBuilder.getSaveSettingsObject(variables);
                saveJson = JSON.stringify(saveJson);
                /*
                if(!odinFormBuilder.isODINLiteUser()){
                    via.saveWindow(odin.PROCESS_MANAGER_APP_ID,saveId,saveJson,function(loadJson){},true,odinFormBuilder.reportOutputType);
                }else{
                    via.saveWindow(odin.PROCESS_MANAGER_APP_ID,saveId,saveJson,function(loadJson){},true);
                }
                */
                via.saveWindow(odin.PROCESS_MANAGER_APP_ID,saveId,saveJson,function(reportName){
                    $('.savedReportName').html("Report Setting: " + reportName);
                },true);

            });
        }

        //Perform translation if needed.
        odin.performTranslation('#formBuilder_form');

        //Style the multi-select boxes.
        /*
        $(".kendo-select").kendoMultiSelect({
            filter: "contains",
            dataTextField: "text",
            dataValueField: "value",
            dataSource: {
                pageSize: odinFormBuilder.MAX_DROPDOWN_ELEMENTS
            }
        });
        */
        //Replaced when we did page size
        var multiSelect = $(".kendo-select");
        for(var i=0;i<multiSelect.length;i++){
            $(multiSelect[i]).kendoMultiSelect({
                filter: "contains",
                dataTextField: "text",
                dataValueField: "value",
                dataSource: {
                    pageSize: odinFormBuilder.MAX_DROPDOWN_ELEMENTS
                }
            });
        }
        //Style the Dropdown list (single select)
        /*
        var dropdownlist = $(".kendo-single-select").kendoDropDownList({
            filter: "contains",
            optionLabel: " ",
            dataTextField: "text",
            dataValueField: "value",
            //dataSource: {
            //    pageSize: odinFormBuilder.MAX_DROPDOWN_ELEMENTS
            //}
        }).data("kendoDropDownList");
        */
        //Replaced when we did page size
        var dropdownlist = $(".kendo-single-select");
        for(var i=0;i<dropdownlist.length;i++) {
            //Make the dropdown
            $(dropdownlist[i]).kendoDropDownList({
                filter: "contains",
                //optionLabel: " ",
                dataTextField: "text",
                dataValueField: "value",
                dataSource: {
                    pageSize: odinFormBuilder.MAX_DROPDOWN_ELEMENTS
                }
            });
        }

        //For dynamic dates
        var dropdownlist = $(".kendo-dynamic-date");
        for(var i=0;i<dropdownlist.length;i++) {
            //Make the dropdown
            var dd = $(dropdownlist[i]).kendoDropDownList({
                filter: "contains",
                //optionLabel: " ",
                dataTextField: "text",
                dataValueField: "value",
                dataSource: {
                    pageSize: odinFormBuilder.MAX_DROPDOWN_ELEMENTS
                },
                change: function(a,b){
                    var name = $(a.sender.element).prop("name");
                    var span = $("#"+name + "Example");
                    span.empty();
                    if(!via.undef(odinFormBuilder.dynamicDateExampleDate) && !via.undef(odinFormBuilder.dynamicDateExampleDate[a.sender.value()])){
                        span.html("<i>"+odinFormBuilder.dynamicDateExampleDate[a.sender.value()] + "</i>");
                    }
                }
            }).data('kendoDropDownList');
            dd.trigger("change");
        }

        //Fix for defaulting to nothing if there is no default value . Kendo defaults to first value
        for(var i=0;i<variables.length;i++){
            if(via.undef(variables[i].type) || variables[i].type!==7){continue;}
            if(via.undef(variables[i].defaultValue) || variables[i].defaultValue.length === 0 || variables[i].defaultValue[0].length===0){
                $('#'+variables[i].variableName+"_inputField").data("kendoDropDownList").value("");
                //$('#'+variables[i].variableName+"_inputField").data("kendoComboBox").select(-1);
            }
        }
        //$(".kendo-single-select").focusin(function(){
         //   $(this).select();
        //});
        //$(".kendo-single-select").attr("readonly", "readonly");

        //Style the Date Boxes - get the correct formatting
        var dateFormat = odin.DEFAULT_DATE_FORMAT;
        if(!via.undef(odin.getUserSpecificSetting("defaultDateFormat"))){ dateFormat = odin.getUserSpecificSetting("defaultDateFormat"); }
        $(".kendo-date").kendoDatePicker({
            format: dateFormat
        });
        //This is to validate the date and it will also parse if it can
        $(".kendo-date").blur(function(){
            if($(this).data('kendoDatePicker') === undefined){ return; }
            var value = $(this).data('kendoDatePicker').value();

            //Try to parse else just get rid of it...
            if(value === null){
                var dateString = $(this).val();
                if(!via.undef(dateString,true)){
                    var date = $.format.date(dateString, 'yyyyMMdd');
                    if(date !== 0){
                        $(this).data('kendoDatePicker').value(date);
                       return;
                    }
                    date = $.format.date(dateString, 'MM/dd/yyyy');
                    if(date !== 0){
                        $(this).data('kendoDatePicker').value(date);
                        return;
                    }
                }
                $(this).data('kendoDatePicker').value(null);
            }
        });

        //Style the file boxes
        $(".kendo-file").kendoUpload({
            multiple: false,
            localization: {
                select: "Select a file..."
            },
            validation: {
                maxFileSize: odinFormBuilder.MAX_FILE_SIZE
            }
        });

        $(".kendo-multiple-file").kendoUpload({
            multiple: true,
            localization: {
                select: "Select files..."
            },
            validation: {
                maxFileSize: odinFormBuilder.MAX_FILE_SIZE
            }
        });

        //Style the image box
        $(".kendo-image-file").kendoUpload({
            multiple: false,
            localization: {
                select: "Select an image..."
            },
            validation: {
                allowedExtensions: [".jpg",".png",".gif"],
                maxFileSize: odinFormBuilder.MAX_FILE_SIZE
            }
        });

        //Style the color choosers
        $(".kendo-color-chooser").kendoColorPicker({
            buttons: false
        });



        //Style the numberic boxes
        $(".kendo-integer").kendoNumericTextBox({
            format: "#,##0",
            decimals: 0
        });
        $(".kendo-double").kendoNumericTextBox({
            format: "#,##0.00######",
            decimals: 8
        });

        //Make the grouping grids.
        $.each(odinFormBuilder.groupedVariables,function(grp){
            var variables = odinFormBuilder.groupedVariables[grp];

            var height = $("#"+via.cleanId(grp)+"_groupButton").closest('.panel-info').height();
            $("#groupGrid_"+via.cleanId(grp)).kendoGrid({
                height:(height-80),
                selectable: true
            });

            //Event for the delete button
            $("#"+via.cleanId(grp)+"_groupDeleteButton").click(function() {
                var gridAdditive = $("#groupGrid_" + via.cleanId(grp)).data('kendoGrid');

                var selectedItem = gridAdditive.dataItem(gridAdditive.select());
                gridAdditive.dataSource.remove(selectedItem);
            });

            //Event for the grouping button
            $("#"+via.cleanId(grp)+"_groupButton").click(function(){
                //Get the form data
                var formData = new FormData($('#formBuilder_form')[0]);
                var jsonObject = {};
                formData.forEach(function(value, key){
                    if(!via.undef(jsonObject[key])){
                        jsonObject[key] =  jsonObject[key] + ";" + value;
                    }else {
                        jsonObject[key] = value;
                    }
                });

                var isError = false;
                var rec = {};
                $.each(variables,function(idx) {
                    var variable = variables[idx];
                    var value = jsonObject[variable.variableName];
                    switch(variable.type){
                        case odinFormBuilder.DATE_FIELD:
                            var dateType = jsonObject[variable.variableName + "_dateType"];
                            if(dateType === "dynamic"){
                                rec[variable.variableName] = jsonObject[variable.variableName + "_dynamic"];
                            }else{
                                rec[variable.variableName] = kendo.toString(kendo.parseDate(value+"","dd-MMM-yyyy"),"yyyyMMdd");
                                //rec[variable.variableName] = value;
                            }
                            break;
                        default:
                            rec[variable.variableName] = value;
                    }
                    if (variable.isRequired === true && via.undef(rec[variable.variableName], true)) {
                        isError = true;
                        via.kendoAlert("Error","'"+variable.label+"' is a required value.");
                    }
                });

                if(isError !== true) {
                    var grid = $("#groupGrid_" + via.cleanId(grp)).data('kendoGrid');
                    grid.dataSource.add(rec);
                    //$('#formBuilder_form')[0].reset();
                }

            });
        });


        $("#formBuilder_form").submit(function(e){
            e.preventDefault();

            //set the report id
            var passedReportId = via.getParamsValue("reportKey");
            if(passedReportId !== null){
                via.debug("Overriding report key:", passedReportId);
                odinFormBuilder.reportId = passedReportId;
            }else {
                odinFormBuilder.reportId = via.randomString();
            }
            $('#formBuilder_reportId').val(odinFormBuilder.reportId);

            //Change the date submit format.
            if ( $( ".kendo-date" ).length ) {
                var dateBoxes = $( ".kendo-date" );
                for(var i=0;i<dateBoxes.length;i++) {
                    var dateBox = dateBoxes[i];
                    var dateBoxName = $(dateBox).attr("name");
                    if(via.undef(dateBoxName,true)){ continue; }
                    $(dateBox).data("kendoDatePicker").setOptions({
                        format: "yyyyMMdd"
                    });

                }
            }

            //Get the form data
            var formData = null;


            /*For fixing the order of the select boxes*/
            if ( $( ".kendo-select" ).length ) {
                var selectFormElements = {};
                var selectBoxes = $( ".kendo-select" );
                //Loop through the select boxes
                for(var i=0;i<selectBoxes.length;i++){
                    var selectBox = selectBoxes[i];
                    var isMulti = $(selectBox).prop('multiple');
                    if(!isMulti){continue;}//Only do this for Multi Boxes
                    var selectBoxName = $(selectBox).attr("name");
                    //Get the correct order
                    var selectBoxValues = $(selectBox).data("kendoMultiSelect").value();
                    var selectOptions = [];
                    for(var x in selectBoxValues){
                        selectOptions.push(selectBoxValues[x]);
                    }
                    selectFormElements[selectBoxName] = selectBoxValues;
                    //Clear the value of the select box. Needed to do it this way because internet explorer does not support formData.delete().
                    $(selectBox).val(null);
                }
                formData = new FormData($(this)[0]);
                $.each( selectFormElements, function( key, value ) {
                    for(var j=0;j<value.length;j++){
                        formData.append(key,value[j]);
                    }
                });
                /*End - fixing the order of the select boxes*/
            }else{
                formData = new FormData($(this)[0]);
            }

            //For Debugging - Prints form data being passed.
            /*
            if(via.isDebug()) {
                try {//For IE not support of formData.entries()
                    for(var pair of formData.entries()) {
                        console.log("formData: " + pair[0]+ ', '+ pair[1]);
                    }
                }catch(e){}
            }
            */

            odinFormBuilder.runReport(formData);
        });
    },

    /**
     * loadReportSettings
     * This method will set the saved settings into the report.
     */
    loadReportSettings: function(loadJson, variables){
        //console.log('loadJson',loadJson);

        //Load the groups.
        $.each(odinFormBuilder.groupedVariables,function(grp){

            if(!via.undef(loadJson[via.cleanId(grp) + "_grid"])){
                var grid = $("#groupGrid_" + via.cleanId(grp)).data('kendoGrid');
                grid.dataSource.data([]);
                grid.dataSource.data(JSON.parse(loadJson[via.cleanId(grp) + "_grid"]));
            }
        });

        //Load the variables
        for(var i=0;i<variables.length;i++){
            var currVar = variables[i];
            if(via.undef(currVar) || via.undef(currVar.variableName)){ continue; }
            var varName = currVar.variableName;

            //Gather the settings for all the types.
            switch(currVar.type){
                case odinFormBuilder.IMAGE_FIELD:
                    if(!via.undef(loadJson[varName],true)){
                        //Change the radio
                        $("input[name="+ varName + "_imageType" +"][value=" + "existing" + "]").prop('checked', true).trigger('change');
                        //Click the image
                        var img = $('#'+currVar.variableName+'_existingImageContainer').find("[data-image-name='" + loadJson[varName] + "']");
                        odinFormBuilder.selectImage(img);
                    }
                    break;
                    var imageType = $('input[name='+currVar.variableName+'_imageType]:checked').val();
                    if(!via.undef(imageType) && imageType === 'existing'){
                        var selectedImg = $('#'+currVar.variableName+'_existingImageContainer .existingImage_selected');
                        if(!via.undef(selectedImg) && !via.undef($(selectedImg).data("image-name"))) {
                            saveObj[currVar.variableName] = $(selectedImg).data("image-name");
                        }
                    }else{
                        saveObj[currVar.variableName] = "";
                    }
                    break;
                case odinFormBuilder.DATE_ITERATOR_FIELD:
                    //Start Date
                    if(!via.undef(loadJson[varName + "_S"],true)){
                        if(via.undef($( "input[name='"+currVar.variableName+"_S']")) || $( "input[name='"+currVar.variableName+"_S']").length === 0){continue;}
                        var startDte = kendo.parseDate(loadJson[varName + "_S"], odin.DEFAULT_DATE_SAVE_FORMAT);
                        $( "input[name='"+currVar.variableName+"_S']").data("kendoDatePicker").value(startDte);
                    }

                    //End Date
                    if(!via.undef(loadJson[varName + "_E"],true)){
                        if(via.undef($( "input[name='"+currVar.variableName+"_E']")) || $( "input[name='"+currVar.variableName+"_E']").length === 0){continue;}
                        var endDte = kendo.parseDate(loadJson[varName + "_E"], odin.DEFAULT_DATE_SAVE_FORMAT);
                        $( "input[name='"+currVar.variableName+"_E']").data("kendoDatePicker").value(endDte);
                    }
                    break;
                case odinFormBuilder.DATE_FIELD:
                    if(!via.undef(loadJson[varName],true)){//Check for the saved variable
                        if(!via.undef(loadJson[varName + "_dateType"]) && loadJson[varName + "_dateType"] === 'dynamic'){
                            var singleSelect = $('#' + varName + "_dynamicField").data("kendoDropDownList");
                            singleSelect.value(loadJson[varName]);
                            singleSelect.trigger("change");
                        }else{
                            if(via.undef($( "input[name='"+currVar.variableName+"']")) || $( "input[name='"+currVar.variableName+"']").length === 0){continue;}
                            var dte = kendo.parseDate(loadJson[varName], odin.DEFAULT_DATE_SAVE_FORMAT);
                            $( "input[name='"+currVar.variableName+"']").data("kendoDatePicker").value(dte);
                        }
                    }
                    $("input[name="+ varName + "_dateType" +"][value=" + loadJson[varName + "_dateType"] + "]").prop('checked', true).trigger('change');
                    break;
                case odinFormBuilder.INTEGER_FIELD:
                case odinFormBuilder.DOUBLE_FIELD:
                    if(!via.undef(loadJson[varName],true)){//Check for the saved variable
                        if(via.undef($( "input[name='"+currVar.variableName+"']")) || $( "input[name='"+currVar.variableName+"']").length === 0){continue;}
                        $( "input[name='"+currVar.variableName+"']").data("kendoNumericTextBox").value(loadJson[varName]);
                    }
                    break;
                case odinFormBuilder.DROP_DOWN_FIELD:
                case odinFormBuilder.TREE_DROP_DOWN_FIELD:
                case odinFormBuilder.CHECK_LIST_BOX_FIELD:
                    if(!via.undef(loadJson[varName],true)){//Check for the saved variable
                        if(via.undef($('#' + currVar.variableName + "_inputField") || $('#' + currVar.variableName + "_inputField").length === 0)){continue;}
                        //Single Selection
                        if(via.undef($('#' + currVar.variableName + "_inputField")[0].multiple) || $('#' + currVar.variableName + "_inputField")[0].multiple === false) {
                            $('#' + currVar.variableName + "_inputField").data("kendoDropDownList").value(loadJson[varName]);
                        }else{//Multi selection
                            $('#' + currVar.variableName + "_inputField").data("kendoMultiSelect").value(loadJson[varName].split(";"));
                        }
                    }
                    break;
                case odinFormBuilder.LONG_TEXT_FIELD:
                    if(!via.undef(loadJson[varName],true)) {//Check for the saved variable
                        if(via.undef($( "#"+currVar.variableName+"_textArea" )) || $( "#"+currVar.variableName+"_textArea" ).length === 0){continue;}
                        $( "#"+currVar.variableName+"_textArea").val(loadJson[varName]);
                    }
                    break;
                case odinFormBuilder.COLOR_CHOOSER_FIELD:
                    if(!via.undef(loadJson[varName],true)) {//Check for the saved variable
                        if (via.undef($("#" + currVar.variableName)) || $("#" + currVar.variableName).length === 0) {
                            continue;
                        }
                        var picker = $("#" + currVar.variableName).data('kendoColorPicker');
                        if(!via.undef($("#" + currVar.variableName))){
                            picker.value(loadJson[varName]);
                        }
                    }
                    break;
                default:
                    if(!via.undef(loadJson[varName],true)){//Check for the saved variable
                        try {
                            if (via.undef($("input[name='" + currVar.variableName + "']")) || $("input[name='" + currVar.variableName + "']").length === 0) {
                                continue;
                            }
                            $("input[name='" + currVar.variableName + "']").val(loadJson[varName]);
                        }catch(err){}
                    }
            }
        }

    },

    /**
     * getSaveSettingsObject
     * This method will return the object that gets saved to the server.
     */
    getSaveSettingsObject: function(variables){
        var saveObj = {};

        //Loop the grouping.
        var groupedVariables = [];
        $.each(odinFormBuilder.groupedVariables,function(grp){
            var grid = $("#groupGrid_" + via.cleanId(grp)).data('kendoGrid');
            saveObj[via.cleanId(grp) + "_grid"] = JSON.stringify(grid.dataSource.data().toJSON());

            var variables = odinFormBuilder.groupedVariables[grp];
            for(var i in variables){
                groupedVariables.push(variables[i].variableName);
            }
        });

        //Get the variables
        for(var i=0;i<variables.length;i++){
            var currVar = variables[i];
            if(via.undef(currVar) || via.undef(currVar.variableName)){ continue; }
            if($.inArray(currVar.variableName,groupedVariables) !== -1){ continue; }//Dont save grouped variables

            //Gather the settings for all the types.
            switch(currVar.type){
                case odinFormBuilder.IMAGE_FIELD:
                    var imageType = $('input[name='+currVar.variableName+'_imageType]:checked').val();
                    if(!via.undef(imageType) && imageType === 'existing'){
                        var selectedImg = $('#'+currVar.variableName+'_existingImageContainer .existingImage_selected');
                        if(!via.undef(selectedImg) && !via.undef($(selectedImg).data("image-name"))) {
                            saveObj[currVar.variableName] = $(selectedImg).data("image-name");
                        }
                    }else{
                        saveObj[currVar.variableName] = "";
                    }
                    break;
                case odinFormBuilder.DATE_ITERATOR_FIELD:
                    //Start Date
                    if(via.undef($( "input[name='"+currVar.variableName+"_S']")) || $( "input[name='"+currVar.variableName+"_S']").length === 0){continue;}
                    var startDateBoxValue = $( "input[name='"+currVar.variableName+"_S']").data("kendoDatePicker").value();
                    saveObj[currVar.variableName + "_S"] = kendo.toString(startDateBoxValue, odin.DEFAULT_DATE_SAVE_FORMAT);

                    //End Date
                    if(via.undef($( "input[name='"+currVar.variableName+"_E']")) || $( "input[name='"+currVar.variableName+"_E']").length === 0){continue;}
                    var endDateBoxValue = $( "input[name='"+currVar.variableName+"_E']").data("kendoDatePicker").value();
                    saveObj[currVar.variableName + "_E"] = kendo.toString(endDateBoxValue, odin.DEFAULT_DATE_SAVE_FORMAT);
                    break;
                case odinFormBuilder.DATE_FIELD:
                    var dateType = $('input[name='+currVar.variableName+'_dateType]:checked').val();
                    if(!via.undef(dateType) && dateType === 'dynamic'){
                        if(via.undef($('#' + currVar.variableName + "_dynamicField") || $('#' + currVar.variableName + "_dynamicField").length === 0)){continue;}
                        saveObj[currVar.variableName + "_dateType"] = "dynamic";
                        var singleSelect = $('#' + currVar.variableName + "_dynamicField").data("kendoDropDownList");
                        saveObj[currVar.variableName] = singleSelect.value();
                    }else {
                        saveObj[currVar.variableName + "_dateType"] = "date";
                        if (via.undef($("input[name='" + currVar.variableName + "']")) || $("input[name='" + currVar.variableName + "']").length === 0) {
                            continue;
                        }
                        var dateBoxValue = $("input[name='" + currVar.variableName + "']").data("kendoDatePicker").value();
                        saveObj[currVar.variableName] = kendo.toString(dateBoxValue, odin.DEFAULT_DATE_SAVE_FORMAT);
                    }
                    break;
                case odinFormBuilder.DROP_DOWN_FIELD:
                case odinFormBuilder.TREE_DROP_DOWN_FIELD:
                case odinFormBuilder.CHECK_LIST_BOX_FIELD:
                    if(via.undef($('#' + currVar.variableName + "_inputField") || $('#' + currVar.variableName + "_inputField").length === 0)){continue;}
                    //Single Selection
                    if(via.undef($('#' + currVar.variableName + "_inputField")[0].multiple) || $('#' + currVar.variableName + "_inputField")[0].multiple === false){
                        var singleSelect = $('#' + currVar.variableName + "_inputField").data("kendoDropDownList");
                        saveObj[currVar.variableName] = singleSelect.value();
                    }else{//Multi selection
                        var multiSelect = $('#' + currVar.variableName + "_inputField").data("kendoMultiSelect");
                        saveObj[currVar.variableName] = multiSelect.value().join(";");
                    }
                    break;
                case odinFormBuilder.LONG_TEXT_FIELD:
                    if(via.undef($( "#"+currVar.variableName+"_textArea" )) || $( "#"+currVar.variableName+"_textArea" ).length === 0){continue;}
                    saveObj[currVar.variableName] = $( "#"+currVar.variableName+"_textArea" ).val();
                    break;
                default:
                    if(via.undef($( "input[name='"+currVar.variableName+"']")) || $( "input[name='"+currVar.variableName+"']").length === 0){continue;}
                    saveObj[currVar.variableName] = $( "input[name='"+currVar.variableName+"']" ).val();
            }
        }

        //console.log('saveObj',saveObj);
        return saveObj;
    },

    getFieldSetHtml: function(set,variables){
        var html = '';
        var fsSet = [];
        //Create the groupings for the FieldSets
        set.currIdx.forEach(function(e){
            var fsName = variables[e].fieldSetName;
            //Has Field Set
            if(!via.undef(fsName)){
                var found = false;
                for(var i=0;i<fsSet.length;i++){
                    var o = fsSet[i];
                    if(o.name === fsName){
                        fsSet[i].set.push(e);
                        found = true;
                        break;
                    }
                }
                if(found === false){
                    fsSet.push({
                        name: fsName,
                        set: [e]
                    });
                }
            }else{
                fsSet.push({
                    name: null,
                    set: [e]
                });
            }
        });
        //End - Create the groupings for the FieldSets

        var groups = [];
        for(var i=0;i<fsSet.length;i++){
            if(i===0) {
                html += '<div class="well">';
            }

            var obj = fsSet[i];
            //Has NO FieldSet
            if(obj.name === null){
                for(var j=0;j<fsSet[i].set.length;j++) {
                    var variable = variables[fsSet[i].set[j]];
                    if(via.undef(variable.groupName,true)) {
                        html += odinFormBuilder.getFieldTypeHtml(variable);
                    }else if($.inArray(variable.groupName,groups)===-1){
                        groups.push(variable.groupName);
                    }
                }
                //Do the groups now.
                if(i===(fsSet.length-1)) {
                    html += odinFormBuilder.getGroupHtml(groups);
                }
            }
            //Has a FieldSet
            else{
                for(var j=0;j<fsSet[i].set.length;j++) {
                    if(j===0){
                        /* Well
                         html += '<div class="well">' +
                         '<h3>' + fsSet[i].name + '</h3>' +
                         '<hr/>';
                         */
                        html += '<div class="panel panel-'+odinFormBuilder.STYLE+'">' +
                            '<div class="panel-heading">' +
                            '<h3 class="panel-title">'+fsSet[i].name+'</h3>' +
                            '</div>' +
                            '<div class="panel-body">';
                    }

                    var variable = variables[fsSet[i].set[j]];
                    if(via.undef(variable.groupName,true)) {
                        html += odinFormBuilder.getFieldTypeHtml(variable);
                    }else if($.inArray(variable.groupName,groups)===-1){
                        groups.push(variable.groupName);
                    }

                    if(j===(fsSet[i].set.length-1)){
                        html += odinFormBuilder.getGroupHtml(groups);

                        html += '</div>' +
                            '</div>';
                        /* Well
                         html += '</div>';
                         */
                    }
                }
            }


            if(i===(fsSet.length-1)) {
                html += '</div>';
            }
        }

        return html;
    },

    addGroupVariablesToFormData: function(formData){

        //Loop through the variables and delete.
        $.each(odinFormBuilder.groupedVariables,function(group,o){
            for(var i in o){
                var variable = o[i];
                formData.delete(variable.variableName);
                if(variable.type === odinFormBuilder.DATE_FIELD){
                    formData.delete(variable.variableName + "_dateType");
                    formData.delete(variable.variableName + "_dynamic");
                }
            }
        });

        //Loop through the grids and add their values.
        var variableList = {};
        $.each(odinFormBuilder.groupedVariables,function(grp,o) {
            var grid = $("#groupGrid_" + via.cleanId(grp)).data('kendoGrid');
            var jsonArr= grid.dataSource.data().toJSON();
            for(var v in o){
                var variable = o[v];
                var variableName = variable.variableName;
                var variableString = "";
                for(var r=0;r<jsonArr.length;r++){
                    var row = jsonArr[r];
                    //Add the value
                    if(!via.undef(row[variableName])){
                        variableString += row[variableName];
                        if((jsonArr.length - 1) !== r) {
                            if(!via.undef(variable.delimiter)){
                                variableString += variable.delimiter;
                            } else {
                                variableString += ";";
                            }
                            /*
                            if (variable.type === odinFormBuilder.CHECK_LIST_BOX_FIELD) {
                                variableString += ";;";
                            } else {
                                variableString += ";";
                            }
                            */
                        }
                    }
                }
                variableList[variableName] = variableString;
            }
        });


        //Add the variables to the form
        $.each(variableList,function(group,varString){
            formData.append(group,varString);
        });


       return formData;
    },

    getGroupHtml: function(groups){
        if(via.undef(groups) || groups.length === 0){
            return "";
        }

        //Loop the groups.
        var html = "";
        for(var i=0;i<groups.length;i++){
            var group = groups[i];

            //Make the field set
            html += '<div style="margin-bottom:10px;" class="panel panel-'+odinFormBuilder.STYLE+'">' +
                '<div class="panel-heading">' +
                '<h3 class="panel-title">'+group+'</h3>' +
                '</div>' +
                '<div class="panel-body">';

            //make the row
            html += '<div class="row">'+
                '<div class="col-md-5" >';
            var groupGridName = "groupGrid_"+via.cleanId(group);
            var tableHtml = '<table id="'+groupGridName+'" class="groupingGrid">' +
                '<thead><tr>';
            if(!via.undef(odinFormBuilder.groupedVariables) && !via.undef(odinFormBuilder.groupedVariables[group])){
                var groupVariables = odinFormBuilder.groupedVariables[group];
                for(var j=0;j<groupVariables.length;j++) {
                    var variable = groupVariables[j];
                    html += odinFormBuilder.getFieldTypeHtml(variable);
                    tableHtml += '<th data-field="'+variable.variableName+'">'+variable.label+'</th>';
                }
            }
            tableHtml += "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>";

            //Add the table
            html+="</div>" +
                '<div class="col-md-1" >' +
                '<button type="button" id="'+via.cleanId(group)+'_groupButton" style="margin:30px 0 0 40px;" title="Add Settings" class="tr btn btn-primary">' +
                '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>' +
                '</button>' +
                '<button type="button" id="'+via.cleanId(group)+'_groupDeleteButton" style="clear:both;margin:20px 0 0 40px;" title="Delete Settings" class="tr btn btn-danger">' +
                '<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>' +
                '</button>' +
                '</div>' +
                '<div class="col-md-6" >' +
                tableHtml +
                '</div>';

            //End the field set
            html += '</div>' +
                '</div></div>';
        }

        return html;
    },

    getFieldTypeHtml: function(variable){
        var fieldHtml = "";

        //Handle the default values
        var defaultValue = "";
        if(!via.undef(variable.defaultValue)){
            defaultValue = variable.defaultValue[0];
            if(variable.type === odinFormBuilder.DATE_FIELD && !via.undef(defaultValue,true)){
                var date = $.format.date(defaultValue, 'yyyyMMdd');
                defaultValue = $.format.date(date, 'yyyy-MM-dd');
            }
        }

        switch(variable.type) {
            case odinFormBuilder.DATE_ITERATOR_FIELD:
                //For Defaults
                var startDefaultValue = "";
                var endDefaultValue = "";
                if(!via.undef(variable.defaultValue)){
                    if(variable.defaultValue.length > 0 && !via.undef(variable.defaultValue[0])){
                        var startDate = $.format.date(variable.defaultValue[0], 'yyyyMMdd');
                        startDefaultValue = $.format.date(startDate, 'yyyy-MM-dd');
                    }
                    if(variable.defaultValue.length > 1 && !via.undef(variable.defaultValue[1])){
                        var endDate = $.format.date(variable.defaultValue[1], 'yyyyMMdd');
                        endDefaultValue = $.format.date(endDate, 'yyyy-MM-dd');
                    }
                }
                //For Date Iterator.
                fieldHtml += '<div class="form-group row">' +
                        '<div class="col-md-12">' +
                            //Start Date
                            '<label for="'+variable.variableName+'_S">'+variable.label+' Start Date</label>' +
                            '<input style="width:100%;" type="date" class="kendo-date" name="'+variable.variableName+'_S" placeholder="" value="'+startDefaultValue+'">' +
                            //End Date
                            '<label for="'+variable.variableName+'_E">'+variable.label+' End Date</label>' +
                            '<input style="width:100%;" type="date" class="kendo-date" name="'+variable.variableName+'_E" placeholder="" value="'+endDefaultValue+'">' +
                        '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.TEXT_FIELD:
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<input style="width:100%;" type="text" class="k-textbox" name="'+variable.variableName+'" placeholder="" value="'+defaultValue+'">' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.INTEGER_FIELD:
                var minMaxText = "";
                if(!via.undef(variable.intRange) && variable.intRange.length === 2
                    && variable.intRange[0] !== variable.intRange[1]){
                    minMaxText = "min=" + variable.intRange[0] + " max=" + variable.intRange[1];
                }
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<input style="width:100%;" type="text" class="kendo-integer" name="'+variable.variableName+'" placeholder="" '+minMaxText+' value="'+defaultValue+'">' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.DOUBLE_FIELD:
                var minMaxText = "";
                if(!via.undef(variable.doubleRange) && variable.doubleRange.length === 2
                    && variable.doubleRange[0] !== variable.doubleRange[1]){
                    minMaxText = "min=" + variable.doubleRange[0] + " max=" + variable.doubleRange[1];
                }
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<input style="width:100%;" type="text" class="kendo-double" name="'+variable.variableName+'" placeholder="" '+minMaxText+' value="'+defaultValue+'">' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.PASSWORD_FIELD:
                fieldHtml += '<div class="form-group">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<input style="width:100%;" type="password" class="k-textbox" name="'+variable.variableName+'">' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.DATE_FIELD:
                if(defaultValue === null){
                    defaultValue = "";
                }
                //Commented on 11/14/2018 by Rocco - implemented dynamic dates
                /*
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<input type="date" style="width:100%;" class="kendo-date" name="'+variable.variableName+'" placeholder="" value="'+defaultValue+'">' +
                    '</div>' +
                    '</div>';
                */

                //Dynamic Date Implementation, on 20181114 by Rocco
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label>' + variable.label +
                    ((variable.hasHelpLink === true) ? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\'' + variable.variableName + '\',\'' + variable.label + '\');">' : '') + //Check for help Link
                    '</label>' +
                    '<br/>' +
                    //Radio buttons
                    '<input type="radio" value="date" name="'+variable.variableName+'_dateType" id="'+variable.variableName+'_dateRadio" class="k-radio" checked="checked" onchange="$(\'#'+variable.variableName+'_dynamicDateContainer\').hide();$(\'#'+variable.variableName+'_realDateContainer\').show();$(\'img[data-variable-name='+variable.variableName+']\').removeClass(\'existingImage_selected\');">' +
                    '<label class="k-radio-label" for="'+variable.variableName+'_dateRadio">Static Date Selection</label>' +
                    '<input type="radio" value="dynamic" name="'+variable.variableName+'_dateType" id="'+variable.variableName+'_dynamicRadio" class="k-radio" style="margin-left:20px;" onchange="$(\'#'+variable.variableName+'_dynamicDateContainer\').show();$(\'#'+variable.variableName+'_realDateContainer\').hide();delete odinFormBuilder.selectedImages[\''+variable.variableName+'\'];">' +
                    '<label class="k-radio-label" for="'+variable.variableName+'_dynamicRadio">Dynamic Date Selection</label>';
                    //This is for a date chooser
                fieldHtml += '<span id="' + variable.variableName + '_realDateContainer">' +
                    '<input type="date" style="width:100%;" class="kendo-date" name="'+variable.variableName+'" placeholder="" value="'+defaultValue+'">' +
                    '</span>' +

                    '<br/>';
                //This is for a dynamic date.
                fieldHtml += '<div style="display:none;" id="' + variable.variableName + '_dynamicDateContainer">' +
                    '<select id="'+variable.variableName+'_dynamicField" style="width:100%;" name="'+variable.variableName+'_dynamic" class="kendo-dynamic-date form-control">';

                //Populate the different types.
                if(!via.undef(odinFormBuilder.dynamicDateComboData,true)) {//Check for empty values
                    for (var i = 0; i < odinFormBuilder.dynamicDateComboData.length; i++) {//Loop through elements
                        var text = odinFormBuilder.dynamicDateComboData[i].text;
                        var value = odinFormBuilder.dynamicDateComboData[i].value;
                        if (via.undef(text, true) || via.undef(value, true)) {
                            continue;
                        }
                        //For limiting the date options.
                        if(!via.undef(variable.dynamicDateList)){
                            var idx = $.inArray(text,variable.dynamicDateList);
                            if(idx === -1){
                                continue;
                            }
                        }

                        var selected = '';
                        if (!via.undef(variable.defaultValue) && variable.defaultValue.indexOf(value) !== -1) {
                            selected = 'selected';
                        }
                        fieldHtml += '<option ' + selected + ' value="' + value + '">' + text + '</option>';
                    }
                }
                fieldHtml += '</select>' +
                    '<br><span style="color:red;margin-left:10px;" id="' + variable.variableName + '_dynamicExample">' +
                    '</span>';

                fieldHtml += '</div>' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.FILE_ONLY_FIELD:
            case odinFormBuilder.FILE_PATH_FIELD:
            case odinFormBuilder.DIRECTORY_FIELD:
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<input style="width:100%;" type="file" class="kendo-file" name="'+variable.variableName+'">' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.FILE_UPLOAD_FIELD:
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<input style="width:100%;" type="file" class="kendo-multiple-file" name="'+variable.variableName+'">' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.DROP_DOWN_FIELD:
                fieldHtml +=
                    '<div style="margin-bottom: 10px;" class="row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<select id="'+variable.variableName+'_inputField" style="width:100%;" name="'+variable.variableName+'" class="kendo-single-select form-control">';


                if(!via.undef(variable.valueList,true)) {//Check for empty values
                    for (var i = 0; i < variable.valueList.length; i++) {//Loop through elements
                        var localValue = variable.localValueList[i];
                        var value = variable.valueList[i];
                        if (via.undef(value, true)) {
                            continue;
                        }
                        var selected = '';
                        if (!via.undef(variable.defaultValue) && variable.defaultValue.indexOf(value) !== -1) {
                            selected = 'selected';
                        }
                        fieldHtml += '<option ' + selected + ' value="' + value + '">' + localValue + '</option>';
                    }
                }
                fieldHtml += '</select>' +
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.TREE_DROP_DOWN_FIELD:
            case odinFormBuilder.CHECK_LIST_BOX_FIELD:
                fieldHtml +=
                    '<div style="margin-bottom: 10px;" class="row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label><br/>';
                if(!via.undef(variable.singleSelection) && variable.singleSelection === false && variable.type !== odinFormBuilder.TREE_DROP_DOWN_FIELD){
                    fieldHtml += '<select id="'+variable.variableName+'_inputField" style="width:100%;" multiple class="kendo-select" name="'+variable.variableName+'">';
                }else{
                    fieldHtml += '<select id="'+variable.variableName+'_inputField" style="width:100%;" class="kendo-single-select" name="'+variable.variableName+'">';
                    if(via.undef(variable.appendNullItem) || variable.appendNullItem === true) {
                        fieldHtml += '<option value=""> </option>';
                    }
                }

                if(!via.undef(variable.valueList,true)) {//Check for empty values
                    for (var i = 0; i < variable.valueList.length; i++) {
                        var localValue = variable.localValueList[i];
                        var value = variable.valueList[i];
                        if (via.undef(value, true)) {
                            continue;
                        }
                        var selected = '';
                        if (!via.undef(variable.defaultValue,true)  && variable.defaultValue.length > 0 && $.inArray(value,variable.defaultValue)!==-1){
                            selected = 'selected';
                        }
                        fieldHtml += '<option ' + selected + ' value="' + value + '">' + localValue + '</option>';
                    }
                }

                fieldHtml += '</select></div></div>';
                break;
            case odinFormBuilder.LONG_TEXT_FIELD:
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label +
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>';

                if(!via.undef(variable.characterCount) && variable.characterCount > 0) {
                    fieldHtml +=
                        '<textarea onkeyup="odinFormBuilder.checkTextAreaLength(this,\''+variable.variableName+'\','+variable.characterCount+');" id="'+variable.variableName+'_textArea" rows="4" style="width:100%;" class="k-textbox" name="'+variable.variableName+'" placeholder="" >' +
                        defaultValue +
                        '</textarea>' +
                        '<small class="'+variable.variableName+'_characterCount"></small>';
                }else{
                    fieldHtml += '<textarea id="'+variable.variableName+'_textArea" rows="4" style="width:100%;" class="k-textbox" name="'+variable.variableName+'" placeholder="" >' +
                        defaultValue +
                        '</textarea>';
                }

                fieldHtml +=
                    '</div>' +
                    '</div>';
                break;
            case odinFormBuilder.IMAGE_FIELD:
                //This has saved images. Show the thumbnails as well.
                if(!via.undef(variable.savedImages) && !$.isEmptyObject(variable.savedImages)){
                    fieldHtml += '<div class="form-group row">' +
                        '<div class="col-md-12">' +
                        '<label>' + variable.label +
                        ((variable.hasHelpLink === true) ? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\'' + variable.variableName + '\',\'' + variable.label + '\');">' : '') + //Check for help Link
                        '</label>' +
                        '<br/>' +
                        '<input type="radio" value="existing" name="'+variable.variableName+'_imageType" id="'+variable.variableName+'_existingRadio" class="k-radio" checked="checked" onchange="$(\'#'+variable.variableName+'_newImageContainer\').hide();$(\'#'+variable.variableName+'_existingImageContainer\').show();$(\'img[data-variable-name='+variable.variableName+']\').removeClass(\'existingImage_selected\');">' +
                        '<label class="k-radio-label" for="'+variable.variableName+'_existingRadio">Existing Image</label>' +
                        '<input type="radio" value="new" name="'+variable.variableName+'_imageType" id="'+variable.variableName+'_newRadio" class="k-radio" style="margin-left:20px;" onchange="$(\'#'+variable.variableName+'_newImageContainer\').show();$(\'#'+variable.variableName+'_existingImageContainer\').hide();delete odinFormBuilder.selectedImages[\''+variable.variableName+'\'];">' +
                        '<label class="k-radio-label" for="'+variable.variableName+'_newRadio">New Image</label>' +
                        //This is for a new image.
                        '<span id="' + variable.variableName + '_newImageContainer" style="display:none;"><input style="width:100%;" type="file" class="kendo-image-file" name="' + variable.variableName + '" id="' + variable.variableName + '"></span>' +
                        //This is for an existing image.
                        '<br/>' +
                        '<div class="existingImage_container" id="' + variable.variableName + '_existingImageContainer">';


                    var count = 0;
                    $.each(variable.savedImages,function(key,value){
                        if(count===0){
                            fieldHtml += '<img class="existingImage" onload="odinFormBuilder.selectImage(this);" onclick="odinFormBuilder.selectImage(this);" data-variable-name="' + variable.variableName + '" data-image-name="' + key + '" src="data:image/jpeg;base64,' + value + '"/>';
                        }else {
                            fieldHtml += '<img class="existingImage" onclick="odinFormBuilder.selectImage(this);" data-variable-name="' + variable.variableName + '" data-image-name="' + key + '" src="data:image/jpeg;base64,' + value + '"/>';
                        }
                        count++;
                    });

                    fieldHtml += '</div>' +
                        '</div>' +
                        '</div>';
                }else {
                    fieldHtml += '<div class="form-group row">' +
                        '<div class="col-md-12">' +
                        '<label for="' + variable.variableName + '">' + variable.label +
                        ((variable.hasHelpLink === true) ? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\'' + variable.variableName + '\',\'' + variable.label + '\');">' : '') + //Check for help Link
                        '</label>' +
                        '<input style="width:100%;" type="file" class="kendo-image-file" name="' + variable.variableName + '">' +
                        '</div>' +
                        '</div>';
                }
                break;
            case odinFormBuilder.COLOR_CHOOSER_FIELD:
                fieldHtml += '<div class="form-group row">' +
                    '<div class="col-md-12">' +
                    '<label for="'+variable.variableName+'">'+variable.label+
                    ((variable.hasHelpLink === true)? ' <img src="../images/help.png" style="cursor:pointer;" onClick="odinFormBuilder.displayHelpLink(\''+variable.variableName+'\',\''+variable.label+'\');">' : '') + //Check for help Link
                    '</label>' +
                    '<br/><input style="width:100%;" class="kendo-color-chooser" name="'+variable.variableName+'" id="'+variable.variableName+'" value="'+defaultValue+'">' +
                    '</div>' +
                    '</div>';
                break;
            /*
            case odinFormBuilder.CHECK_LIST_BOX_FIELD:
                var multiple = '';
                if(!via.undef(variable.singleSelection) && variable.singleSelection === false){
                    multiple = 'multiple';
                }
                var unselectedHtml = '';
                var selectedHtml = '';
                fieldHtml +=
                    '<label for="'+variable.variableName+'">'+variable.label+'</label>' +
                    '<div class="row">' +
                    '<div class="col-md-6">' +
                    '<select '+multiple+' name="'+variable.variableName+'" class="form-control">';
                for(var i=0;i<variable.valueList.length;i++){
                    var value = variable.valueList[i];
                    var selected = '';
                    if(!via.undef(variable.defaultValue) && variable.defaultValue.indexOf(value) !== -1){
                        selectedHtml += '<option>'+value+'</option>';
                        selected = 'selected';
                    }else{
                        unselectedHtml += '<option>'+value+'</option>';
                    }
                    //fieldHtml += '<option '+selected+'>'+value+'</option>';
                }
                fieldHtml += unselectedHtml + '</select></div>';


                fieldHtml += '<div class="col-md-6"><select '+multiple+' name="'+variable.variableName+'" class="form-control">' +
                    selectedHtml +
                    '</select>' +
                    '</div></div>';
                break;
                */
        }

        return fieldHtml;
    },

    checkTextAreaLength: function(textArea,varName,charCount){
        var len = $(textArea).val().length;
        if(len === charCount){
            $('.' + varName + '_characterCount').html("<span style='color:darkred;'>"+len + " of " + charCount + " characters.</span>");
        }else if(len > charCount){
            $(textArea).val($(textArea).val().substring(0,charCount));
            len = $(textArea).val().length;
            $('.' + varName + '_characterCount').html("<span style='color:darkred;'>"+len + " of " + charCount + " characters.</span>");
        }else {
            $('.' + varName + '_characterCount').html(len + " of " + charCount + " characters.");
        }
    },

    selectImage: function(img){
        var varName = $(img).data("variableName");
        var imgName = $(img).data("imageName");

        //Select the image
        $("img[data-variable-name='"+varName+"']").removeClass("existingImage_selected");
        $(img).addClass("existingImage_selected");
        odinFormBuilder.selectedImages[varName] = imgName;
    },

    displayHelpLink: function(variableName, variableLabel){
        $.post(odin.SERVLET_PATH,
            {
                action: 'processmanager.getHelpLinkData',
                processKey: odinFormBuilder.jobName,
                variableName: variableName

            },
            function(data, status){

                if(!via.undef(data,true) && data.success === false){
                    via.debug("Failure getting help link:", data.message);

                }else{
                    via.debug("Success with help link:", data);
                    via.displayHelpLink(variableLabel,data.helpLinkText);
                }
            },
            'json');
    },

    runReport: function(formData){
        //Perform translation if needed.
        //odin.performTranslation('#progressPanel');
        //Hide the account button
        $('#accountButton').hide();//Show Admin Controls
        $(".adminControls").hide();

        //Setup the log area
        $('#formBuilder_showLogContainer').hide();
        $('#formBuilder_showLogContainer').empty();
        $('#formBuilder_showLogButton').show();
        $('#formBuilder_terminateJobButton').prop( "disabled", false );
        if(!via.undef(odinFormBuilder.isUseInternalJVMEnabled) && odinFormBuilder.isUseInternalJVMEnabled===true){
            $('#formBuilder_terminateJobButton').hide();
        }else{
            $('#formBuilder_terminateJobButton').show();
        }

        //Debug Detail
        if(odinFormBuilder.isUseInternalJVMEnabled){
            formData.append('useExternalJVM',!$("#useInternalJVMSwitch").data("kendoMobileSwitch").check());
            if($("#useInternalJVMSwitch").data("kendoMobileSwitch").check()){
                formData.append('debugDetail',"0");
            }else{
                formData.append('debugDetail',$("#debugDetail").data("kendoSlider").value());
            }
        }else{
            formData.append('useExternalJVM','true');
            formData.append('debugDetail',$("#debugDetail").data("kendoSlider").value());
        }

        //Add the report type for
        formData.append('srcApp','App Builder');

        //Add the Override User
        formData.append('overrideUser',odinFormBuilder.odinLite_overrideUser);

        //Add the selected Images
        formData.append('selectedImages',JSON.stringify(odinFormBuilder.selectedImages));

        //Add the group variables to formData
        formData = odinFormBuilder.addGroupVariablesToFormData(formData);

        //Check the required variables
        var jsonObject = {};
        formData.forEach(function(value, key){
            jsonObject[key] = value;
        });
        if(!via.undef(odinFormBuilder.DYNAMIC_SETTING_LIST)){
            for(var i=0;i<odinFormBuilder.DYNAMIC_SETTING_LIST.length;i++){
                var variable = odinFormBuilder.DYNAMIC_SETTING_LIST[i];
                if(variable.isRequired === true) {
                    var value = null;
                    if (variable.type === odinFormBuilder.IMAGE_FIELD) {
                        var imageType = jsonObject[variable.variableName+"_imageType"];
                        if(imageType === "existing"){
                            if(!via.undef(jsonObject.selectedImages)){
                                var selectedImages = JSON.parse(jsonObject.selectedImages);
                                var image = selectedImages[variable.variableName]
                                if(!via.undef(image)){
                                    value = image;
                                }
                            }
                        }else{
                            value = jsonObject[variable.variableName];
                        }
                    }else if (variable.type === odinFormBuilder.DATE_FIELD) {
                        var dateType = jsonObject[variable.variableName+"_dateType"];
                        if(dateType === "dynamic"){
                            value = jsonObject[variable.variableName+"_dynamic"];
                        }else{
                            value = jsonObject[variable.variableName];
                        }
                    } else {
                        value = jsonObject[variable.variableName];
                    }
                    if (via.undef(value, true)) {
                        via.kendoAlert("Missing Value", "'" + variable.label + "' is required.");
                        return;
                    }
                }
            }
        }
        //End - Check for required variables

        //Update the report id so that there are no duplicates
        $('#formBuilder_reportId').val(via.randomString());

        //Hide the main panel
        $('#mainPanel').hide();

        //Show the progress bar
        $('#progressPanel').fadeIn();

        var intervalId = setInterval(function(){
            odinFormBuilder.streamLogFile();
        },500);


        //Make the call to the run.
        $.ajax({
            url: odin.SERVLET_PATH,
            type: 'POST',
            data: formData,
            async: true,
            cache: false,
            contentType: false,
            processData: false,
            dataType: 'json',
            success: function (data) {
                $('#progressPanel').hide();
                clearInterval(intervalId);

                //Show the account button
                $('#accountButton').show();

                //Change the dates back to what it should be for display - they were changed for submitting.
                var dateFormat = odin.DEFAULT_DATE_FORMAT;
                if(!via.undef(odin.getUserSpecificSetting("defaultDateFormat"))){ dateFormat = odin.getUserSpecificSetting("defaultDateFormat"); }
                if ( $( ".kendo-date" ).length ) {
                    var dateBoxes = $( ".kendo-date" );
                    for(var i=0;i<dateBoxes.length;i++) {
                        var dateBox = dateBoxes[i];
                        var dateBoxName = $(dateBox).attr("name");
                        if(via.undef(dateBoxName,true)){ continue; }
                        $(dateBox).data("kendoDatePicker").setOptions({
                            format: dateFormat
                        });
                    }
                }

                //Reset the variables.
                odinFormBuilder.currentDynamicStringVariables = null;
                odinFormBuilder.currentStringIteratorSettingList = null;

                //Check the run.
                if(!via.undef(data,true) && data.success === false){
                    via.debug("Report Form Failure:", data.message);
                    odinFormBuilder.currentJobBreakdown = null;
                    odin.alert("Report Run Error",data.message);

                    $('#formBuilder_resultButtons').show();
                    $('#resultsPanel').empty();
                }else{
                    via.debug("Report Ran Successful:", data);

                    //Store the variables
                    odinFormBuilder.currentDynamicStringVariables = data.dynamicStringVariables;
                    odinFormBuilder.currentStringIteratorSettingList = data.stringIteratorSettingList;

                    //Create output report.
                    odinFormBuilder.createOutputReport(data);
                }
            }
        });

        /*
        //Non-Jquery Call
        var xhr = new XMLHttpRequest();
        xhr.open('POST',odin.SERVLET_PATH,true);
        // xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
        //if you have included the setRequestHeader remove that line as you need the
        // multipart/form-data as content type.
        xhr.onload = function(){
            console.log(xhr.responseText);
        }
        xhr.send(formData);
        */
    },

    getLogFile: function(){
        //Call to the server to get the job info
        $.post(odin.SERVLET_PATH,
            $.extend(via.getQueryParams(), {
                action: 'processmanager.getLog',
                reportId: odinFormBuilder.reportId
            }),
            function(data){
                if(!via.undef(data,true) && data.success === false){
                    via.debug("Get Log Failure:", data.message);
                    odinFormBuilder.currentJobBreakdown = null;
                    odin.alert("Get Log Error",data.message);
                }else{
                    via.debug("Get Log Successful:", data);
                    via.alert("Log File",data.log);
                }
            },
            'json');
    },

    /**
     * terminateJob
     * this will end a curently running job
     */
    terminateJob: function(){
        //Call to the server to get the job info
        $.post(odin.SERVLET_PATH,
            $.extend(via.getQueryParams(), {
                action: 'processmanager.stopRunningProcess',
                reportId: odinFormBuilder.reportId
            }),
            function(data){
                if(!via.undef(data,true) && data.success === false){
                    via.debug("Terminate Failure:", data.message);
                    odinFormBuilder.currentJobBreakdown = null;
                    odin.alert("Terminate Failure",data.message);
                }else{
                    via.debug("Terminate Successful:", data);
                    $(".appTitle").append('<span id="processTerminatedMessage" style="margin-left: 15px;" class="label label-danger navbar-default">'+data.message+'</span>');
                    $('#processTerminatedMessage').fadeOut(4500, function(){
                        $('#processTerminatedMessage').remove();
                    });
                }
            },
            'json');
    },

    /**
     * streamLogFile
     * this writes a live streaming log to the page
     */
    streamLogFile: function(){
        //Call to the server to get the job info
        $.post(odin.SERVLET_PATH,
            $.extend(via.getQueryParams(), {
                action: 'processmanager.getLog',
                reportId: odinFormBuilder.reportId
            }),
            function(data){
                if(!via.undef(data,true) && data.success !== false && !via.undef(data.log,true)) {
                    var d = $('#formBuilder_showLogContainer');
                    d.html(data.log);
                    d.scrollTop(d.prop("scrollHeight"));
                }
            },
            'json');
    },

    /**
     * createDashboardReport
     * This will create a dashboard report from json provided
     */
    createDashboardReport: function(data,layoutJson){
        //Current Tab
        var currentTab = null;

        //Get the layout json for this table
        if(via.undef(data.chartData,true)){//Error check for data
            via.alert("Layout Error","Could not find layout json in dataset.");
            $('#smallLoadingMessage').hide();
            return;
        }

        //Check for tabs
        if(via.undef(layoutJson.tabs) || layoutJson.tabs.length === 0){
            via.alert("Layout Error","Could not find any tabs in layout data.");
            $('#smallLoadingMessage').hide();
            return;
        }

        var tabIdMap = {};
        var tabColMap = {};
        //Check whether to draw the tabs
        if(layoutJson.tabs.length === 1 && via.undef(layoutJson.tabs[0].displayName)){//don't draw the tabs
            tabIdMap[0] = "tab_"+via.randomString();
        }else {//Draw the tabs
            //Draw the tab ul
            var tabHtml = '<ul class="nav nav-tabs nav-justified" style="margin-top:5px;" role="tablist">';
            for (var i = 0; i < layoutJson.tabs.length; i++) {
                tabIdMap[i] = "tab_"+via.randomString();
                var tabName = layoutJson.tabs[i].displayName;
                if (via.undef(tabName, true)) {
                    tabName = "Tab " + (i + 1);
                }
                var style = "";
                if(layoutJson.tabs.length <= 1){
                    style = "style=\"display:none;\"";
                }

                tabHtml += '<li role="presentation" '+style+' class="' + ((i === 0) ? "active" : "") + '"><a href="#' + tabIdMap[i] + '" aria-controls="' + tabIdMap[i] + '" role="tab" data-toggle="tab">' + tabName + '</a></li>';
            }
            tabHtml += "</ul>";

        }

        //Loop through the tabs and make their panels.
        tabHtml += '<div class="tab-content">';
        for (var i = 0; i < layoutJson.tabs.length; i++) {
            var rows = layoutJson.tabs[i].rows;
            var id = tabIdMap[i];
            //Check for empty rows error
            if(via.undef(rows,true)){
                via.alert("Layout Error","Could not find any rows in layout data.");
                $('#smallLoadingMessage').hide();
                return;
            }
            //Make the tab panel
            tabHtml += drawPanel( i, tabIdMap[i], rows, tabColMap );
        }
        tabHtml += '</div>';

        //Hide the loading message and write the html
        $('#resultsPanel').append(tabHtml);
        $('#smallLoadingMessage').hide();


        //Tab event. Draw on activate
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr("href") // activated tab
            var colIdMap = tabColMap[target];
            currentTab = target;
            drawAllColumns(colIdMap);
        });

        //Draw the initial Widgets for the first tab
        var firstTabId = "#"+tabIdMap[0];
        var colIdMap = tabColMap[firstTabId];
        currentTab = firstTabId;
        drawAllColumns(colIdMap);

        //For a window Resize event
        $( window ).resize(function() {
            var colIdMap = tabColMap[currentTab];
            drawAllColumns(colIdMap);
        });

        /*** Functions ***/
        //Draw panel function draws the actual tab div panels
        function drawPanel(index,id,panelJson , tabColMap){
            var colIdMap = {};
            //console.log('panelJson',panelJson,index,id);

            //Main Panel
            var panelHtml = '<div class="container-fluid tab-pane ' + ((i === 0) ? "active" : "") + '" id="'+id+'">';

            //Loop Through Rows
            for (var r = 0; r < panelJson.length; r++) {
                var row = panelJson[r];
                panelHtml += '<div class="row">';
                //Check empty columns
                if(via.undef(row.columns,true)){
                    via.alert("Layout Error","Could not find any columns in row layout data.");
                    $('#smallLoadingMessage').hide();
                    return;
                }

                //Get the column widths
                var totalStaticWidth = 0;
                var columns = 0;
                for (var c = 0; c < row.columns.length; c++) {
                    var columnJson = row.columns[c];
                    if(!via.undef(columnJson.width,true)) {
                        totalStaticWidth += columnJson.width
                    }else{
                        columns++;
                    }
                }

                //Loop through columns
                var colWidth = Math.round((12-totalStaticWidth)/columns);
                for (var c = 0; c < row.columns.length; c++) {
                    var columnJson = row.columns[c];
                    columnJson.height = row.height;
                    columnJson.num = r;
                    //panelHtml += drawColumn(columnJson,colWidth);
                    var colId = "col_"+via.randomString();
                    var currColWidth = colWidth;
                    if(!via.undef(columnJson.width,true)) {
                        currColWidth = columnJson.width;
                    }
                    panelHtml += '<div id="'+colId+'" class="col-md-'+currColWidth+'"></div>';
                    colIdMap[colId] = columnJson;
                }

                //close out the div - row
                panelHtml += "</div>";
            }

            //Assign the tab id and its column
            tabColMap["#"+id] = colIdMap;

            //Write and close out the div
            panelHtml += "</div>";
            return panelHtml;
        }

        function drawAllColumns(colIdMap){
            var rowNum = 0;
            var totalStaticHeight = 0;
            var rowsTmp = {};
            //Find row num and static height
            $.each(colIdMap,function(id,json){
                if(!rowsTmp.hasOwnProperty(json.num)){
                    rowsTmp[json.num] = json.num;
                    //Static height
                    if(!via.undef(json.height,true)){
                        totalStaticHeight+=parseInt(json.height);
                    }
                    //Row num
                    if(via.undef(json.height)) {//Dont increase if using static height
                        rowNum++;
                    }
                }
            });

            //Get row height
            var headerPanels = 150 + totalStaticHeight;
            var minHeight = 100;
            var rowHeight = $(window).height();
            rowHeight = rowHeight/rowNum;//Divide by number of rows
            rowHeight = rowHeight - (headerPanels/rowNum);//minus the headers
            if(rowHeight < minHeight){ rowHeight = minHeight; }

            $('#resultsPanel').css({'min-height' : ($(window).height()-80)+"px", 'height' : ($(window).height()-80)+"px"});


            $.each(colIdMap,function(id,json){
                if(!via.undef(json.height,true)){
                    $("#" + id).css("height", parseInt(json.height));
                }else {
                    $("#" + id).css("height", rowHeight);
                }
                drawColumn(id,json);
            });
        }

        //Draws the column or the actual widget
        function drawColumn(colId,columnJson){
            var type = columnJson.type;
            //Check empty type
            if(via.undef(type,true)){
                via.alert("Layout Error","Could not find the type of the column in row layout data.");
                $('#smallLoadingMessage').hide();
                return "";
            }

            switch(type){
                case "html":
                    if(via.undef(columnJson.html,true)){break;}
                    var html = ""+columnJson.html;

                    if(!via.undef(data.dataset.scalars)) {
                        $.each(data.dataset.scalars,function(key,value){
                            html = html.replace("["+key+"]",value);
                        });
                    }
                    $('#'+colId).html(html);
                    break;
                case "table":
                    var tableLabel = null;
                    var tableIdx = 0;
                    if(via.undef(columnJson.tableLabel)){
                        tableLabel = data.dataset.tableLabels[0];
                    }else{
                        tableLabel = columnJson.tableLabel;
                        tableIdx = $.inArray(tableLabel,data.dataset.tableLabels);
                    }
                    if($("#table_"+colId).length){ break; }
                    if(!via.undef(data.treeMap[tableLabel])){
                        $('#'+colId)
                        .css("overflow","scroll")
                        .css("margin-top","2px");
                        odinTable.createTreeTable("table_"+colId,JSON.parse(JSON.stringify(data.treeMap[tableLabel])), '#'+colId,data.tableFormatting);
                    }else {
                        odinTable.createTable("table_"+colId, data.dataset.tablesets[tableIdx], '#'+colId,data.tableFormatting);
                    }
                    break;
                default://Must be a chart
                    //Draw the chart widget
                    var overrideMargin = {top: 2, right: 2, bottom: 2, left: 2};
                    if(type === 'bar'){
                        overrideMargin.bottom = 25;
                        overrideMargin.left = 35;
                        overrideMargin.right = 35;
                    }

                    //Get chartData
                    var tableLabel = null;
                    if(via.undef(columnJson.tableLabel)){
                        tableLabel = data.dataset.tableLabels[0];
                    }else{
                        tableLabel = columnJson.tableLabel;
                    }
                    var chartData = data.chartData[tableLabel];

                    //Get the column values
                    var textColumn = getColumnValue(columnJson.textCol,chartData);
                    var sizeColumn = getColumnValue(columnJson.sizeCol,chartData);
                    var colorColumn = getColumnValue(columnJson.colorCol,chartData);
                    var xColumn = getColumnValue(columnJson.xCol,chartData);
                    var yColumn = getColumnValue(columnJson.yCol,chartData);
                    //console.log('textColumn',columnJson.textCol,textColumn);
                    //console.log('sizeColumn',sizeColumn);
                    //console.log('colorColumn',colorColumn);
                    //console.log('xColumn',xColumn);
                    //console.log('yColumn',yColumn);
                    odinCharts.getChart("#"+colId,type, textColumn, sizeColumn,
                        colorColumn,xColumn,yColumn,
                        chartData,overrideMargin);
            }


            if(!via.undef(columnJson.style,true)){
                var styles = columnJson.style.split(";");
                for(var i in styles){
                    var style = styles[i];
                    if(style.length>0 && style.indexOf(":")!==-1){
                        var [styleName,styleValue] = style.split(":");
                        $('#'+colId).css(styleName,styleValue);
                    }
                }
            }
        }

        function getColumnValue(colVal,chartData){
            var columnName = null;
            if(via.undef(colVal)){
                columnName = chartData.columnHeaders[0];
            }else if($.inArray(colVal,chartData.columnHeaders)!==-1){
                columnName = colVal;
            }else if(!isNaN(parseInt(colVal))){
                var idx = parseInt(colVal);
                columnName = chartData.columnHeaders[idx];
            }
            return columnName;
        }
    },

    createOutputReport: function(json){
        //Show the results panel and back button
        $('#formBuilder_resultButtons').show();
        $('#resultsPanel').empty();

        switch(json.outputType){
            case odinFormBuilder.OUTPUT_TYPE_NO_DISPLAY:
                $('#resultsPanel').html('<div class="well">' +
                        '<h3>' + 'Report has completed successfully.' + '</h3>');
                break;
            case odinFormBuilder.OUTPUT_TYPE_DATA_WINDOW:
                //Put in a wait message
                $('#smallLoadingMessage').show();
                //kendo.ui.progress($("#smallLoadingMessage"), true);

                /**Call to the server to get the DataSet**/
                $.post(odin.SERVLET_PATH,
                    $.extend(via.getQueryParams(), {
                        action: 'processmanager.getDataSet',
                        reportId: odinFormBuilder.reportId,
                        processKey: odinFormBuilder.jobName,
                        debug: via.isDebug(),
                        isKendo: true
                    })).done(function(data){
                        $('.poweredPanel').hide();
                        data = JSON.parse(data.replace(/\bNaN\b/g, "null"));

                        if(!via.undef(data,true) && data.success === false){
                            via.debug("Get DataSet Failure:", data.message);
                            odin.alert("Get DataSet Error",data.message);
                            $('#smallLoadingMessage').hide();
                        }else{
                            odinFormBuilder.currentData = data;
                            via.debug("Get DataSet Successful:", data, odinFormBuilder.reportId);
                            via.debug("DataSet String:", JSON.stringify(data));
                            if(data.dataset.tablesets.length === 0){
                                $('#smallLoadingMessage').hide();
                                odin.alert("Get DataSet Error","No Data Found.");
                                return;
                            }

                            //Title
                            if(!via.undef(data.dataset.scalars) && !via.undef(data.dataset.scalars['Report Title'],true)){
                                $('.appTitle').html(data.dataset.scalars['Report Title']);
                                //Perform translation if needed.
                                odin.performTranslation('.appTitle');
                            }
                            //To make the combobox for select.
                            if(data.dataset.tablesets.length > 1){
                                var html = "Select Report: \n" +
                                    '<select id="select_'+odinFormBuilder.reportId+'">';
                                data.dataset.tableLabels.forEach(function(e,i){
                                    var label = e;
                                    if(via.undef(e,true)){
                                        label = i;
                                    }
                                    html += '<option value="'+i+'">'+label+'</option>\n';
                                });
                                html += '</select>';

                                $('#resultsPanel').html(html);

                                //Add the combobox change event.
                                $('#select_'+odinFormBuilder.reportId).change(function(){
                                    //Return if there is a dashboard
                                    if(!via.undef(data.dashboardJson)) {
                                        return;
                                    }

                                    var idx = $('#select_'+odinFormBuilder.reportId).val();
                                    $('#smallLoadingMessage').show();
                                    //$('#loadingContainer').html('<span class="label label-info"><i class="fa fa-spinner fa-pulse fa-fw"></i> Loading...</span>');
                                    $('#dwContainer').empty();
                                    setTimeout(function(){
                                        $('#dwContainer').empty();
                                        $('#treeExpandContainer').empty();
                                        var tableLabel = data.dataset.tablesets[idx].tableLabel;
                                        if(!via.undef(data.treeMap[tableLabel])){
                                            odinTable.createTreeTable('table_' + odinFormBuilder.reportId, JSON.parse(JSON.stringify(data.treeMap[tableLabel])), '#dwContainer',data.tableFormatting);
                                        }else {
                                            odinTable.createTable('table_' + odinFormBuilder.reportId, data.dataset.tablesets[idx], '#dwContainer',data.tableFormatting);
                                        }
                                        $('#smallLoadingMessage').hide();
                                        //kendo.ui.progress($("#smallLoadingMessage"), false);
                                    },25);
                                });
                            }
                            $('#resultsPanel').append(' <a title="Export to Excel"  id="exportButton_' + odinFormBuilder.reportId+'" class="tr btn btn-sm btn-success" href="#"><i class="fa fa-file-excel-o"></i></a>' +
                                '<span id="saveIconContainer"></span>' +
                                '<span id="webServiceIconContainer"></span>' +
                                '<span id="chartIconContainer"></span>' +
                                '<span id="treeExpandContainer"></span>' +
                                '<br>' +
                                '<span id="dwContainer"></span>');
                            //For Saving and Loading
                            if(!via.undef(data.saveId) && data.saveId !== -1){
                                //Uncomment to turn save and load on...
                                //$('#saveIconContainer').append(' | <span><a title="Load Saved Settings"  id="loadButton_' + odinFormBuilder.reportId+'" class="tr btn btn-sm btn-primary" href="#"><i class="fa fa-folder-open-o"></i></a></span>' +
                                //    ' | <span><a title="Save Grid Settings"  id="saveButton_' + odinFormBuilder.reportId+'" class="tr btn btn-sm btn-primary" href="#"><i class="fa fa-floppy-o"></i></a></span>');

                                var appId = odin.PROCESS_MANAGER_APP_ID;//Process Manager App Id
                                var saveId = data.saveId;
                                $("#loadButton_" + odinFormBuilder.reportId).click(function(){
                                    via.loadWindow(appId,saveId,function(loadJson){
                                        //Callback function for Load
                                        odinTable.setSettingsForGrid(loadJson);
                                    });
                                });
                                $("#saveButton_" + odinFormBuilder.reportId).click(function(){
                                    var saveJson = odinTable.getSettingsForGrid();
                                    saveJson = JSON.stringify(saveJson);
                                    via.saveWindow(appId,saveId,saveJson,function(reportName){
                                    });
                                });
                            }
                            //For Charting
                            if(!via.undef(data.isChartingEnabled) && data.isChartingEnabled===true){
                                $('#chartIconContainer').append('<span><a title="Launch Charting"  id="chartButton_' + odinFormBuilder.reportId+'" class="tr btn btn-sm btn-warning pull-right" href="#"><i class="fa fa-pie-chart"></i></a></span>');
                                $("#chartButton_" + odinFormBuilder.reportId).click(function(){
                                    var idx = $('#select_'+odinFormBuilder.reportId).val();
                                    if(via.undef(idx)){
                                        idx = 0;
                                    }
                                    var tableLabel = data.dataset.tablesets[idx].tableLabel;
                                    if(!via.undef(data.chartData[tableLabel])) {
                                        odinCharts.init("#chartIconContainer", data.chartData[tableLabel],'../odinCharts/odinCharts.html',data.treeMap.hasOwnProperty(tableLabel));
                                    }
                                });
                            }
                            //For Web Service
                            var enableWebServices = odin.getUserSpecificSetting("enableWebServices");
                            if(!via.undef(enableWebServices,true) && enableWebServices === "true" && !via.undef(json.hasWebServiceTemplate) && json.hasWebServiceTemplate === true) {
                                $('#webServiceIconContainer').append('<span><a style="margin-left:10px;" title="Download Web Service Excel File"  id="webServiceButton_' + odinFormBuilder.reportId + '" class="tr btn btn-sm btn-warning pull-right" href="#"><i class="fa fa-cog"></i></a></span>');
                                $("#webServiceButton_" + odinFormBuilder.reportId).click(function () {
                                    odinFormBuilder.downloadWebServiceFile();
                                });
                            }

                            //$('#smallLoadingMessage').show();
                            //$('#loadingContainer').html('<span class="label label-info"><i class="fa fa-spinner fa-pulse fa-fw"></i> Loading...</span>');

                            //Export event
                            $('#exportButton_' + odinFormBuilder.reportId).click(function(){
                                kendo.ui.progress($("#treeExpandContainer"), true);
                                setTimeout(function(){
                                    kendo.ui.progress($("#treeExpandContainer"),false);
                                },1000);

                                var idx = $('#select_'+odinFormBuilder.reportId).val();
                                if(via.undef(idx)){
                                    idx = 0;
                                }
                                var url = odin.SERVLET_PATH + "?action=processmanager.getDataWindowFile&reportId=" + odinFormBuilder.reportId +
                                    "&processKey=" + odinFormBuilder.jobName + "&reportType=xls&idx=" + idx + "&overrideUser=" + (via.undef(odinFormBuilder.odinLite_overrideUser,true)?"":odinFormBuilder.odinLite_overrideUser);
                                window.location = url;
                            });

                            //Make the trees
                            setTimeout(function(){
                                var tableLabel = data.dataset.tablesets[0].tableLabel;

                                if(!via.undef(data.dashboardJson)) {
                                    try {
                                        var dashboardJson = JSON.parse(data.dashboardJson);
                                        odinFormBuilder.createDashboardReport(data,dashboardJson);
                                    }catch(e){
                                        console.log("JSON Parse Error",e)
                                    }
                                }else if(!via.undef(data.treeMap[tableLabel])){
                                    odinTable.createTreeTable('table_' + odinFormBuilder.reportId,JSON.parse(JSON.stringify(data.treeMap[tableLabel])), '#dwContainer',data.tableFormatting);
                                }else {
                                    odinTable.createTable('table_' + odinFormBuilder.reportId, data.dataset.tablesets[0], '#dwContainer',data.tableFormatting);
                                }
                                $('#smallLoadingMessage').hide();
                                //kendo.ui.progress($("#smallLoadingMessage"), false);


                            },250);


                            //Perform translation if needed.
                            odin.performTranslation('#resultsPanel');
                        }
                    },
                    'json');
                break;
            case odinFormBuilder.OUTPUT_TYPE_FILE:
                var url = odin.SERVLET_PATH + "?action=processmanager.downloadReportFile&reportId=" + odinFormBuilder.reportId + "&processKey=" + odinFormBuilder.jobName + "&debug=" + via.isDebug() + "&overrideUser=" + (via.undef(odinFormBuilder.odinLite_overrideUser,true)?"":odinFormBuilder.odinLite_overrideUser);
                if(!via.undef(json.isFileEmpty) && json.isFileEmpty === true){
                    $('#resultsPanel').html(
                        '<div class="row">' +
                        '<div class="col-sm-12">' +
                        '<div class="text-center">' +
                        '<span class="tr">Error generating file. See Log file for details.</span>' +
                        '<br/><a class="tr" href="javascript:window.location=\'' + url + '\'">Download File</a>' +
                        '</div>' +
                        '</div>' +
                        '</div>');
                }else {
                    $('#resultsPanel').html(
                        '<div class="row">' +
                        '<div class="col-sm-12">' +
                        '<div class="text-center">' +
                        '<a class="tr" href="javascript:window.location=\'' + url + '\'">Download File</a>' +
                        '</div>' +
                        '</div>' +
                        '</div>');
                }

                //For Web Service
                var enableWebServices = odin.getUserSpecificSetting("enableWebServices");
                if(!via.undef(enableWebServices,true) && enableWebServices === "true" && !via.undef(json.hasWebServiceTemplate) && json.hasWebServiceTemplate === true) {
                    $('#resultsPanel').append('<span><a style="margin-left:10px;" title="Download Web Service Excel File"  id="webServiceButton_' + odinFormBuilder.reportId + '" class="tr btn btn-sm btn-warning pull-right" href="#"><i class="fa fa-cog"></i></a></span>');
                    $("#webServiceButton_" + odinFormBuilder.reportId).click(function () {
                        odinFormBuilder.downloadWebServiceFile();
                    });
                }

                //$('#resultsPanel').html('<a class="tr" href="javascript:window.location=\''+url+'\'">Download File</a>');
                //via.downloadFile(url);

                //Perform translation if needed.
                odin.performTranslation('#resultsPanel');

                break;
            case odinFormBuilder.OUTPUT_TYPE_DASHBOARD:
                $('#resultsPanel').html('<div class="well">' +
                    '<h3 class="tr">' + 'Dashboard Output Type not supported.' + '</h3>');

                //Perform translation if needed.
                odin.performTranslation('#resultsPanel');

                break;
            case odinFormBuilder.OUTPUT_TYPE_TABLE_DESIGNER:
                var id = "d"+via.randomString();
                $('#resultsPanel').html('<iframe width="100%" height="100%" id="'+id+'"></iframe>');

                    setTimeout(function(){
                        var iframe = document.getElementById(id),
                            iframedoc = iframe.contentWindow.document;
                        iframedoc.open();
                        iframedoc.write(json.html);
                        iframedoc.close();
                    },50);
                break;
            case odinFormBuilder.OUTPUT_TYPE_ENVISION:
                var id = "d"+via.randomString();
                $('#resultsPanel').html('<iframe width="100%" height="100%" id="'+id+'"></iframe>');
                setTimeout(function(){
                    var iframe = document.getElementById(id),
                        iframedoc = iframe.contentWindow.document;
                    iframedoc.open();
                    iframedoc.write(json.html);
                    iframedoc.close();
                },50);
                break;
        }


        $('#resultsPanel').fadeIn();
    },

    /**
     * downloadWebServiceFile
     * This will allow you to download the web service file.
     */
    downloadWebServiceFile: function(){
        /*
        kendo.ui.progress($("#treeExpandContainer"), true);
        setTimeout(function(){
            kendo.ui.progress($("#treeExpandContainer"),false);
        },1000);
        var url = odin.SERVLET_PATH + "?action=processmanager.downloadWebServiceFile&reportId=" + odinFormBuilder.reportId +
            "&processKey=" + odinFormBuilder.jobName +
            "&serverUrl=" + encodeURI(location.origin + "/ODIN/ODINServlet/") +
            "&entityDir=" + encodeURI(odinFormBuilder.odinLite_entityDir) +
            "&overrideUser=" + (via.undef(odinFormBuilder.odinLite_overrideUser,true)?"":odinFormBuilder.odinLite_overrideUser) +
            "&currentDynamicStringVariables=" + encodeURI(JSON.stringify(odinFormBuilder.currentDynamicStringVariables)) +
            "&currentStringIteratorSettingList=" + encodeURI(JSON.stringify(odinFormBuilder.currentStringIteratorSettingList));
        window.location = url;
         */

        kendo.ui.progress($("#treeExpandContainer"), true);//Wait Message off
        $.post(odin.SERVLET_PATH,
            {
                action: 'processmanager.downloadWebServiceFile',
                reportId: odinFormBuilder.reportId,
                processKey: odinFormBuilder.jobName,
                serverUrl: location.origin + "/ODIN/ODINServlet/",
                entityDir: odinFormBuilder.odinLite_entityDir,
                overrideUser: odinFormBuilder.odinLite_overrideUser,
                currentDynamicStringVariables: JSON.stringify(odinFormBuilder.currentDynamicStringVariables),
                currentStringIteratorSettingList: JSON.stringify(odinFormBuilder.currentStringIteratorSettingList)
            },
            function (data, status) {
                kendo.ui.progress($("#treeExpandContainer"), false);//Wait Message off

                if (!via.undef(data, true) && data.success === false) {
                    via.debug("Failure downloading file:", data.message);
                    via.kendoAlert("Download Failure", data.message);
                } else {
                    via.debug("Successful Download:", data);

                    via.downloadFile(odin.SERVLET_PATH + "?action=admin.streamFile&reportName=" + encodeURIComponent(data.reportName));
                }
            },
            'json');
    },

    /**
     * printData
     * This will print the returned data to the screen. Useful for dashboard editor.
     */
    printData: function(){
        if(via.undef(odinFormBuilder.currentData,true)){
            console.log("No Current Data.");
            return;
        }
        var dataStr = JSON.stringify(odinFormBuilder.currentData);
        console.log("-------------");
        console.log("JSON Data",odinFormBuilder.currentData);
        console.log("--Copy For Dashboard Editor--");
        console.log(dataStr);
        console.log("--End - Copy For Dashboard Editor--");
        console.log("-------------");
    },


    /**
     * ----------------------
     * Account Settings
     */
    loadAccountSettings: function(){
        //Hide the other panels
        //odinDataWarehouse.hideAllApplications();
        $('#resultsPanel').hide();
        $('#mainPanel').hide();
        $('#formBuilder_resultButtons').hide();
        $(".adminControls").hide();

        $('#accountSettings').fadeIn();

        $('#accountButton').hide();
        $('#accountButton_back').fadeIn();
        $('#accountButton_back').one( "click", function() {
            $('#accountButton_back').hide();
            $('#accountButton').show();
            $('#accountSettings').hide();
            $('#mainPanel').fadeIn();
            $('.poweredPanel').fadeIn();
            if(via.isDebug()){
                $(".adminControls").fadeIn();
            }
        });
    },

    hideAccountSettings: function(){
        $('#accountSettings').hide();
    },
    /**
     * End Account Settings
     * ----------------------
     */
};