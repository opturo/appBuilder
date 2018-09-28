/**
 * Created by rocco on 5/7/2018.
 */
var odinDashboardBuilder = {
    layoutData: null,//Stores the layout data.
    data: null,//Stores the data

    /**
     * init
     * Initialize the application
     */
    init: function(){
        odin.userIsLoggedIn(odinDashboardBuilder.setUserLoggedIn,function(){
            //Get the params
            //var params = via.getQueryParams();
            var queryString = "";
            var paramString = odin.getParameterString();
            if(!via.undef(paramString,true)){
                queryString += "&"+paramString;
            }
            window.location = '../../index.jsp?referrer=./appBuilder/builder/index.html' + queryString;
        });
    },

    /**
     * setUserLoggedIn
     * This does the initial setup.
     */
    setUserLoggedIn: function(){
        //Initialize the context menu
        odinDashboardBuilder.initContextMenu();

        //Fade in the loading message
        $("#odinLogoutButton").fadeIn();


        if(via.undef(odinDashboardBuilder.data)) {
            odinDashboardBuilder.showDataPanel();
        }else{

            odinDashboardBuilder.initialDataIsSet();
        }

        //remove the loading message
        setTimeout(function() {
            $('#smallLoadingMessage').hide();
        },100);
    },

    /**
     * showDataPanel
     * This will allow you to enter the data you are working with.
     */
    showDataPanel: function(){
        $("#dataEntryPanel").fadeIn();

        $(".column_dataEntryButton").on('click',function(){
            var jsonStr = $("#dataEntry_input").val();
            if(via.undef(jsonStr)){
                via.alert("Data Empty", "Must Specify Data for Dashboard.");
                return;
            }

            try {
                odinDashboardBuilder.data = JSON.parse(jsonStr);
            }catch(err){
                via.alert("Parse Error", "Error parsing JSON: " + err);
                return;
            }
            $("#dataEntryPanel").hide();
            odinDashboardBuilder.initialDataIsSet();
        });
    },

    /**
     * initialDataIsSet
     * This will happen after the data is set.
     */
    initialDataIsSet: function(){
        //Initialize the column editor
        odinDashboardBuilder.initColumnEditor();

        //Fade in settings panel
        $("#previewButton").fadeIn();

        //Enable layout button
        $('.setLayout_button').removeAttr("disabled");

        //Fade in divider
        $("#logoutDivider").fadeIn();

        $('#resultsPanel').empty();
        $('#resultsPanel').show();
        //draw the dashboard json id there is any otherwise don't bother
        if(!via.undef(odinDashboardBuilder.data.dashboardJson)){
            odinDashboardBuilder.layoutData = JSON.parse(odinDashboardBuilder.data.dashboardJson);
            odinDashboardBuilder.createDashboardEditor(odinDashboardBuilder.data,odinDashboardBuilder.layoutData);
        }else{//Create an initial JSON
            odinDashboardBuilder.layoutData = {
                "tabs": [{
                    "displayName": "First Tab",
                    "rows": [{
                        "columns": [{
                            "type": "html",
                            "html": "Default Dashboard"
                        }]
                    }]
                }]
            };
            odinDashboardBuilder.createDashboardEditor(odinDashboardBuilder.data,odinDashboardBuilder.layoutData);
        }

    },

    /**
     * initColumnEditor
     * This will initialize the column editor.
     */
    initColumnEditor: function(){
        //Get the tableLabels
        var tableLabels = odinDashboardBuilder.data.dataset.tableLabels;
        $('#columnSourceData_input').kendoDropDownList({
            dataSource: tableLabels,
            change: function(){
                var tableIdx = $.inArray($("#columnSourceData_input").data("kendoDropDownList").value(),odinDashboardBuilder.data.dataset.tableLabels);
                var currTable = odinDashboardBuilder.data.dataset.tablesets[tableIdx];
                var nameColumns = odinCharts.getColumnHeadersOfTypes(currTable.columnHeaders, currTable.columnDataTypes, [0, 3]);
                var valueColumns = odinCharts.getColumnHeadersOfTypes(currTable.columnHeaders, currTable.columnDataTypes, [1, 2, 4, 6]);

                //Initialize the drop downs for the charts
                //Text
                $('#columnTextColumn_list').kendoComboBox({
                    dataSource: nameColumns
                });
                //Size
                $('#columnSizeColumn_list').kendoComboBox({
                    dataSource: valueColumns
                });
                //Color
                $('#columnColorColumn_list').kendoComboBox({
                    dataSource: valueColumns
                });
                //X
                $('#columnXColumn_list').kendoComboBox({
                    dataSource: valueColumns
                });
                //Y
                $('#columnYColumn_list').kendoComboBox({
                    dataSource: valueColumns
                });

            }
        });

        //Width of the column
        $("#columnWidth_input").kendoNumericTextBox({
            min: 0,
            max: 12,
            decimals: 0,
            format: "n0"
        });

        //Type
        $("#columnType_input").kendoDropDownList({
            change: function(){
                var type = $("#columnType_input").data("kendoDropDownList").value();
                switch(type){
                    case 'table':
                        $('.columnChartData_selector').hide();
                        $('.columnHTML_selector').hide();
                        break;
                    case 'html':
                        $('.columnChartData_selector').hide();
                        $('.columnHTML_selector').show();
                        break;
                    case 'scatter':
                        $('.columnChartData_selector').show();
                        $('.columnChartDataScatter_selector').show();
                        $('.columnHTML_selector').hide();
                        break;
                    default://Rest of the charts
                        $('.columnChartData_selector').show();
                        $('.columnChartDataScatter_selector').hide();
                        $('.columnHTML_selector').hide();
                }
            }
        });

        //Get the Column Arrays for the charts
        var initialTable = odinDashboardBuilder.data.dataset.tablesets[0];
        var nameColumns = odinCharts.getColumnHeadersOfTypes(initialTable.columnHeaders, initialTable.columnDataTypes, [0, 3]);
        var valueColumns = odinCharts.getColumnHeadersOfTypes(initialTable.columnHeaders, initialTable.columnDataTypes, [1, 2, 4, 6]);

        //Initialize the drop downs for the charts
        //Text
        $('#columnTextColumn_list').kendoComboBox({
            dataSource: nameColumns
        });
        //Size
        $('#columnSizeColumn_list').kendoComboBox({
            dataSource: valueColumns
        });
        //Color
        $('#columnColorColumn_list').kendoComboBox({
            dataSource: valueColumns
        });
        //X
        $('#columnXColumn_list').kendoComboBox({
            dataSource: valueColumns
        });
        //Y
        $('#columnYColumn_list').kendoComboBox({
            dataSource: valueColumns
        });
    },

    /**
     * initContextMenu
     * This will initialize a context menu function
     */
    initContextMenu: function(){
        (function ($, window) {

            $.fn.contextMenu = function (settings) {

                return this.each(function () {

                    // Open context menu
                    $(this).on("contextmenu", function (e) {
                        // return native menu if pressing control
                        if (e.ctrlKey) return;

                        //open menu
                        var $menu = $(settings.menuSelector)
                            .data("invokedOn", $(e.target))
                            .show()
                            .css({
                                position: "absolute",
                                left: getMenuPosition(e.clientX, 'width', 'scrollLeft'),
                                top: getMenuPosition(e.clientY, 'height', 'scrollTop')
                            })
                            .off('click')
                            .on('click', 'a', function (e) {
                                $menu.hide();

                                var $invokedOn = $menu.data("invokedOn");
                                var $selectedMenu = $(e.target);

                                settings.menuSelected.call(this, $invokedOn, $selectedMenu);
                            });

                        return false;
                    });

                    //make sure menu closes on any click
                    $('body').click(function () {
                        $(settings.menuSelector).hide();
                    });
                });

                function getMenuPosition(mouse, direction, scrollDir) {
                    var win = $(window)[direction](),
                        scroll = $(window)[scrollDir](),
                        menu = $(settings.menuSelector)[direction](),
                        position = mouse + scroll;

                    // opening menu would pass the side of the page
                    if (mouse + menu > win && menu < mouse)
                        position -= menu;

                    return position;
                }

            };
        })(jQuery, window);
    },

    /**
     * createDashboardReport
     * This will create a dashboard report from json provided
     */
    createDashboardEditor: function(data,layoutJson){
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
                tabHtml += '<li role="presentation" class="' + ((i === 0) ? "active" : "") + '"><a id="ref_'+tabIdMap[i]+'" data-tabidx="'+i+'" href="#' + tabIdMap[i] + '" aria-controls="' + tabIdMap[i] + '" role="tab" data-toggle="tab">' + tabName + '</a></li>';
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
        $( window ).off();
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
            var panelHtml = '<div class="container-fluid tab-pane ' + ((i === 0) ? "active" : "") + '" id="'+id+'" data-tabidx="'+i+'" >';

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
                    panelHtml += '<div id="'+colId+'" data-row="'+r+'" data-column="'+c+'" style="2px;border: 1px solid #77aaff" class="column col-md-'+currColWidth+'"></div>';
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
                    if(via.undef(json.height,true)) {//Don't increase if using static height
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

            $("#"+colId).contextMenu({
                menuSelector: "#contextMenu",
                menuSelected: function (invokedOn, selectedMenu) {
                    var id = null;
                    if($(invokedOn).hasClass("column")){
                        id = $(invokedOn).attr("id");
                    }else{
                        var column = $(invokedOn).parent(".column");
                        id = $(column[0]).attr("id");
                    }
                    var row = $("#"+id).data("row");
                    var column = $("#"+id).data("column");
                    var action = selectedMenu.data("action");

                    var tabIdx = $(currentTab).data("tabidx");
                    odinDashboardBuilder.performDashboardAction(id,tabIdx,row,column,action);

                }
            });

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
                    $('#'+colId).html("Table: " + tableLabel);
                    /*
                    if($("#table_"+colId).length){ break; }
                    if(!via.undef(data.treeMap[tableLabel])){
                        $('#'+colId)
                            .css("overflow","scroll")
                            .css("margin-top","2px");
                        odinTable.createTreeTable("table_"+colId,JSON.parse(JSON.stringify(data.treeMap[tableLabel])), '#'+colId,data.tableFormatting);
                    }else {
                        odinTable.createTable("table_"+colId, data.dataset.tablesets[tableIdx], '#'+colId,data.tableFormatting);
                    }
                    */
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

                    $('#'+colId).html("Chart: " + type);
                    //Get the column values
                    /*var textColumn = getColumnValue(columnJson.textCol,chartData);
                    var sizeColumn = getColumnValue(columnJson.sizeCol,chartData);
                    var colorColumn = getColumnValue(columnJson.colorCol,chartData);
                    var xColumn = getColumnValue(columnJson.xCol,chartData);
                    var yColumn = getColumnValue(columnJson.yCol,chartData);*/
                    //console.log('textColumn',columnJson.textCol,textColumn);
                    //console.log('sizeColumn',sizeColumn);
                    //console.log('colorColumn',colorColumn);
                    //console.log('xColumn',xColumn);
                    //console.log('yColumn',yColumn);
                    //odinCharts.getChart("#"+colId,type, textColumn, sizeColumn,
                    //    colorColumn,xColumn,yColumn,
                    //    chartData,overrideMargin);
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

    /**
     * performDashboardAction
     * This will do something to the layout data
     */
    performDashboardAction: function(colId,tabIdx,rowIdx,columnIdx,action){
        var tab = odinDashboardBuilder.layoutData.tabs[tabIdx];
        var row = tab.rows[rowIdx];

        switch(action){
            case "addColumn":
                //New Column
                odinDashboardBuilder.editColumnObject({},function(colObj){
                    row.columns.push(colObj);
                    $('#resultsPanel').show();
                    updateEditor();
                });
                break;
            case "editColumn":
                //Existing Column
                odinDashboardBuilder.editColumnObject(row.columns[columnIdx],function(colObj){
                    row.columns[columnIdx] = colObj;
                    $('#resultsPanel').show();
                    updateEditor();
                });
                break;
            case "deleteColumn":
                via.confirm("Delete Column","Are you sure you want to delete this column?",function(){
                    row.columns.splice(columnIdx,1);
                    if(row.columns.length===0){//Delete the row as well.
                        tab.rows.splice(rowIdx,1);
                    }
                    updateEditor();
                });
                break;
            case "addRow":
                odinDashboardBuilder.editColumnObject({},function(colObj){
                    tab.rows.splice(rowIdx+1,0,{});
                    tab.rows[rowIdx+1].columns = [colObj];
                    $('#resultsPanel').show();
                    updateEditor();
                });
                break;
            case "deleteRow":
                via.confirm("Delete Row","Are you sure you want to delete this row?",function(){
                    tab.rows.splice(rowIdx,1);
                    updateEditor();
                });
                break;
            case "setRowHeight":
                via.inputDialog("Row Height","Set row height, leave blank for dynamic height.",function(val){
                    if(via.undef(val,true)){
                        delete row.height;
                    }else{
                        row.height = val;
                    }
                    updateEditor();
                });
                break;
            case "renameTab":
                via.inputDialog("Tab Name","Set a name for your tab.",function(tabName){
                    if(via.undef(tabName,true)){
                        via.alert("Tab Name","Must enter a name for your tab.");
                    }else{
                        odinDashboardBuilder.layoutData.tabs[tabIdx].displayName = tabName;
                    }
                    updateEditor();
                });
                break;
            case "deleteTab":
                via.confirm("Delete Tab","Are you sure you want to delete this tab?",function(){
                    odinDashboardBuilder.layoutData.tabs.splice(tabIdx,1);
                    updateEditor();
                });
                break;
            case "addTab":
                via.inputDialog("Tab Name","Set a name for your tab.",function(tabName){
                    if(via.undef(tabName,true)){
                        via.alert("Tab Name","Must enter a name for your tab.");
                    }else{
                        //Add a new column and ro to the tab. Cannot have blank tabs.
                        odinDashboardBuilder.editColumnObject({},function(colObj){
                            var tabObj = {
                                "displayName":tabName,
                                "rows":[{
                                    "columns":[colObj]
                                }]
                            };
                            odinDashboardBuilder.layoutData.tabs.splice(tabIdx+1,0,tabObj);

                            $('#resultsPanel').show();
                            updateEditor();
                        });
                    }
                });
                break;
        }


        function updateEditor(){
            $("#resultsPanel").empty();
            odinDashboardBuilder.createDashboardEditor(odinDashboardBuilder.data,odinDashboardBuilder.layoutData);

            //Switch tabs if it was not the first tab
            if(tabIdx === 0)return;
            $('.nav-tabs li:eq('+tabIdx+') a').tab('show');
        }
    },

    /**
     * addNewColumn
     * This will return the column object
     */
    editColumnObject: function(colObj,successFn){
        if(via.undef(colObj)){ colObj = {}; }

        //Setup the column panel.

        //Set the data source
        if(via.undef(colObj.tableLabel,true)){
            $('#columnSourceData_input').data('kendoDropDownList').value(colObj.tableLabel);
            $('#columnSourceData_input').data('kendoDropDownList').trigger("change");
        }

        //Set column type and trigger the change event to setup the columns that are visible.
        var colType = colObj.type
        if(via.undef(colType,true)){
            colType = "html";
        }
        $('#columnType_input').data('kendoDropDownList').value(colType);
        var colTypeDD = $("#columnType_input").data("kendoDropDownList");
        colTypeDD.value(colType);
        colTypeDD.trigger("change");

        //Set Initial Chart Data
        setTimeout(function(){
            if(!via.undef(colObj.textCol,true)){
                $("#columnTextColumn_list").data("kendoComboBox").value(colObj.textCol);
            }
            if(!via.undef(colObj.colorCol,true)){
                $("#columnColorColumn_list").data("kendoComboBox").value(colObj.colorCol);
            }
            if(!via.undef(colObj.sizeCol,true)){
                $("#columnSizeColumn_list").data("kendoComboBox").value(colObj.sizeCol);
            }
            if(!via.undef(colObj.xCol,true)){
                $("#columnXColumn_list").data("kendoComboBox").value(colObj.xCol);
            }
            if(!via.undef(colObj.yCol,true)){
                $("#columnYColumn_list").data("kendoComboBox").value(colObj.yCol);
            }
        },500);

        //HTML Initial Value
        if(!via.undef(colObj.html,true)){
            $("#columnHTML_input").val(colObj.html);
        }else{
            $("#columnHTML_input").val(null);
        }

        //CSS Initial Value
        if(!via.undef(colObj.style,true)){
            $("#columnCSS_input").val(colObj.style);
        }else{
            $("#columnCSS_input").val(null);
        }

        //Width Initial Value
        if(!via.undef(colObj.width,true)){
            $("#columnWidth_input").data('kendoNumericTextBox').value(colObj.width);
        }


        //Hide the results panel and then show column panel
        $('#resultsPanel').hide();
        $('#columnEditPanel').fadeIn();

        //Event for save button
        $(".column_editSaveButton").off();
        $(".column_editSaveButton").on("click",function(){
            $('#columnEditPanel').hide();
            saveColumnSettings();
        });

        //Event Cancel Button
        $('.column_editCancelButton').off();
        $('.column_editCancelButton').on("click",function(){
            $('#columnEditPanel').hide();
            $('#resultsPanel').fadeIn();
        });

        function saveColumnSettings(){
            var columnObject = {};
            columnObject.tableLabel = $('#columnSourceData_input').data('kendoDropDownList').value();
            columnObject.type = $('#columnType_input').data('kendoDropDownList').value();


            //Chart only
            if(columnObject.type !== "table" && columnObject.type !== "html") {
                columnObject.textCol = $("#columnTextColumn_list").data("kendoComboBox").value();
                columnObject.colorCol = $("#columnColorColumn_list").data("kendoComboBox").value();
                columnObject.sizeCol = $("#columnSizeColumn_list").data("kendoComboBox").value();
                if(columnObject.type === "scatter") {
                    columnObject.xCol = $("#columnXColumn_list").data("kendoComboBox").value();
                    columnObject.yCol = $("#columnYColumn_list").data("kendoComboBox").value();
                }
            }else if(columnObject.type === "html"){//Html only
                if(!via.undef($("#columnHTML_input").val(),true))
                    columnObject.html = $("#columnHTML_input").val();
            }

            //width make a number or don't include
            var width = $("#columnWidth_input").data('kendoNumericTextBox').value();
            if(!via.undef(width,true) && width!==0) {
                columnObject.width = width;
            }

            var style = $("#columnCSS_input").val();
            if(!via.undef(style,true)) {
                columnObject.style = style;
            }


            //console.log('columnObject',columnObject);
            successFn(columnObject);
        }
    },

    /**
     * getPreviewPanel
     * Preview the data
     */
    getPreviewPanel: function(){
        $("#resultsPanel").empty();
        var mode = $('#previewButton').data("mode");
        if(mode === "preview"){
            $('#previewButton').data("mode","edit");
            $('#previewButton').attr("title","Switch to Preview Mode");
            $('#previewButton').find("i").removeClass("fa-pencil");
            $('#previewButton').find("i").addClass("fa-picture-o");
            odinDashboardBuilder.createDashboardEditor(odinDashboardBuilder.data,odinDashboardBuilder.layoutData);
        }else{
            $('#previewButton').data("mode","preview");
            $('#previewButton').attr("title","Switch to Edit Mode");
            $('#previewButton').find("i").addClass("fa-pencil");
            $('#previewButton').find("i").removeClass("fa-picture-o");
            odinFormBuilder.createDashboardReport(odinDashboardBuilder.data,odinDashboardBuilder.layoutData);
        }
    },

    /**
     * goHome
     * Go Back to App Builder
     */
    goHome: function(){
        window.location = "../"
    },

    /**
     * printJSONLayout
     * Prints the layout to the console for use.
     */
    printJSONLayout: function(){
        console.log("-----------");
        console.log("JSON Data",odinDashboardBuilder.layoutData);
        console.log("-- Copy below for JSON file --");
        console.log(JSON.stringify(odinDashboardBuilder.layoutData,null,2));
        console.log("-- End Copy of JSON --");
        console.log("-----------");
    },

    /**
     * saveJSONLayout
     * Saves the layout to a file for use.
     */
    saveJSONLayout: function(){

        via.downloadClientSideToFile(JSON.stringify(odinDashboardBuilder.layoutData,null,2),
            "dashboardLayout.json","text/plain");
    },


    setJSONLayout: function(){
        $("#resultsPanel").hide();
        $("#layoutEntryPanel").fadeIn();

        $(".column_layoutEntryButton").on('click',function(){

            var jsonStr = $("#layoutEntry_input").val();
            console.log('jsonStr',jsonStr);
            if(via.undef(jsonStr)){
                via.alert("Data Empty", "Must Specify Layout for Dashboard.");
                return;
            }

            try {
                odinDashboardBuilder.layoutData = JSON.parse(jsonStr);
            }catch(err){
                via.alert("Parse Error", "Error parsing JSON: " + err);
                return;
            }
            $("#layoutEntryPanel").hide();
            $("#resultsPanel").empty();
            $("#resultsPanel").show();
            odinDashboardBuilder.createDashboardEditor(odinDashboardBuilder.data,odinDashboardBuilder.layoutData);
        });
    }
};