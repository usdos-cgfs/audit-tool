﻿<div id="divLoading" style="color:green; padding-bottom:10px">Please Wait... Loading</div>
<div id="divRefresh" style="display:none">
	<a title="Refresh this page" href="javascript:void(0)" onclick="Audit.ResponseDocsReport.Report.Refresh()"><span class="ui-icon ui-icon-refresh"></span>Refresh</a>
</div>

<div id="divMsgEmptyDocs" style="display:none; padding-top:10px; font-style:italic"><span class="ui-icon ui-icon-info"></span>Found 0 Documents that were uploaded today and not submitted</div>

<div id="divOutput" style="display:none">
	<table id="tblOutput" class="tablesorter">
		<thead>
			<tr>
				<th class="sorter-false" nowrap="nowrap" colspan="4">Open Response Documents Uploaded Today</th>
			</tr>
			<tr>
				<th class="sorter-true" nowrap="nowrap">Response ID</th>
				<th class="sorter-true" nowrap="nowrap">Title</th>
				<th class="sorter-false" nowrap="nowrap">Download</th>
				<th class="sorter-true" nowrap="nowrap">Modified</th>
			</tr>
		</thead>
		<tbody id="fbody"></tbody>
		<tfoot>
			<tr><th colspan="4">Total: <span id="spanDocTotal" style="color:green"></span></th></tr>
		</tfoot>
	</table>
</div>

<link rel="stylesheet" type="text/css" href="../SiteAssets/css/jqueryui/1.11.3/themes/redmond/jquery-ui.min.css"  />
<link rel="stylesheet" type="text/css" href="../SiteAssets/css/tablesorter/style.css"  />
<link rel="stylesheet" type="text/css" href="../SiteAssets/css/Audit_Styles.css"/>
<link rel="stylesheet" type="text/css" href="../SiteAssets/css/Audit_Page_Reports.css"/>

<script type="text/javascript" src="../SiteAssets/js/jquery/1.7.2/jquery.min.js"></script>
<script type="text/javascript" src="../SiteAssets/js/jqueryui/1.11.3/jquery-ui.min.js"></script>
<script type="text/javascript" src="../SiteAssets/js/jquery.tablesorter.min.js" ></script>
<script type="text/javascript" src="../SiteAssets/js/Audit_Page_Common.js"></script>
<script type="text/javascript" src="../SiteAssets/js/Audit_Page_ResponseDocsSubmittedToday.js"></script>

