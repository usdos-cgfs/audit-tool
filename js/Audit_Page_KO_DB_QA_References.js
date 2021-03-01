﻿<iframe id="CsvExpFrame" style="display: none"></iframe>

<div id="divCounter" style="display:none" title="used to auto refresh the page">1200</div>

<div id="divRefresh" style="display:none">
	<div>
		<a title="Refresh this page" href="javascript:void(0)" onclick="Audit.Common.Utilities.Refresh()"><span class="ui-icon ui-icon-refresh"></span>Refresh</a>
	</div>
	<div style="padding-bottom:10px">
		<a title="View User Manual" href="javascript:void(0)" onclick="Audit.Common.Utilities.ViewUserManuals('QA User Manual')"><span class="ui-icon ui-icon-help"></span>User Manual</a>
	</div>
</div>

<div id="divLoading" style="color:green; padding-bottom:10px">Please Wait... Loading <span data-bind="visible: arrResponses().length > 0 && debugMode, text: arrResponses().length"></span></div>

<div id="tabs" style="display:none; margin-top:20px;">
	<ul>
		<li><a href="#tabs-0">Status Report</a></li>
		<li><a href="#tabs-1">Responses</a></li>
	</ul>
	<div id="tabs-0">
		<div id="lblStatusReportResponsesMsg" style="padding-top:5px;color:green">
			<span data-bind="css: (cntPendingReview() > 0 ? 'ui-icon ui-icon-alert' : 'ui-icon ui-icon-circle-check')"></span>There are <span data-bind="text: cntPendingReview"></span> Responses pending your review
		</div>
		<div id="divButtons" style="padding-top:3px" data-bind="visible: arrResponses().length > 0">
			<a id="btnPrint1" title="Click here to Print" href="javascript:void(0)" class="hideOnPrint"><span class="ui-icon ui-icon-print">Print</span></a>
			<a class="export1 hideOnPrint" title="Export to CSV" href="#"><span class="ui-icon ui-icon-disk">Export to CSV</span></a>
			<a id="btnViewAll" title="View All" href="javascript:void(0)" data-bind="visible: arrFilteredResponsesCount() < arrResponses().length && doSort, click: ClearFiltersResponseTab"><span class="ui-icon ui-icon-circle-zoomout"></span>View All Responses</a>
		</div>
		<div id="divStatusReportRespones">
			<table id="tblStatusReportResponses" class="tablesorter report" data-bind="visible: arrResponses().length > 0" >
				<thead>
					<tr valign="top" class="rowFilters" data-bind="visible: arrResponses().length > 0">
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseRequestID" data-bind="options: $root.ddOptionsResponseTabRequestID, value: filterResponseTabRequestID, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false" nowrap="nowrap"></th>
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseRequestStatus" data-bind="options: $root.ddOptionsResponseTabRequestStatus, value: filterResponseTabRequestStatus, optionsCaption: '-Select-'"></th>
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseRequestInternalDueDate" data-bind="options: $root.ddOptionsResponseTabRequestInternalDueDate, value: filterResponseTabRequestIntDueDate, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseSampleNum" data-bind="options: $root.ddOptionsResponseTabRequestSample, value: filterResponseTabSampleNum, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseName" data-bind="options: $root.ddOptionsResponseTabResponseTitle, value: filterResponseTabResponseName, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseStatus" data-bind="options: $root.ddOptionsResponseTabResponseStatus, value: filterResponseTabResponseStatus, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false" nowrap="nowrap"></th>
						<th class="sorter-false" nowrap="nowrap"></th>
					</tr>
					<tr valign="top">
						<th class="sorter-true" nowrap="nowrap">Request #</th>
						<th class="sorter-false" nowrap="nowrap">Subject</th>
						<th class="sorter-true" nowrap="nowrap">Request Status</th>
						<th class="sorter-true" nowrap="nowrap">Due Date</th>
						<th class="sorter-true" nowrap="nowrap">Sample #</th>
						<th class="sorter-true" nowrap="nowrap">Response Name</th>
						<th class="sorter-true" nowrap="nowrap">Status</th>
						<th class="sorter-true" nowrap="nowrap"># of Documents</th>
						<th class="sorter-true" nowrap="nowrap">Modified</th>
					</tr>
				</thead>
				<tbody id="fbody"></tbody>
				<tfoot class="footer">
					<tr>
						<th colspan="9">Displaying <span id="spanResponsesDisplayedTotal" style="color:green" data-bind="text: arrFilteredResponsesCount()">0</span> out of <span id="spanResponsesTotal" style="color:green" data-bind="text: arrResponses().length">0</span> Responses</th>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>

	<div id="tabs-1">			
		<div style="padding-bottom:15px">
			<table>
				<tr>
					<td><span>Responses Pending Action:</span></td>
					<td><select id="ddlResponsesOpen" data-bind="options: $root.ddOptionsResponseInfoTabResponseNameOpen2, value: filterResponseInfoTabResponseNameOpen2, optionsCaption: '-Select-'"></select></td>
				</tr>
				<tr>
					<td><span>Other Responses:</span></td>
					<td><select id="ddlResponsesProcessed" data-bind="options: $root.ddOptionsResponseInfoTabResponseNameProcessed2, value: filterResponseInfoTabResponseNameProcessed2, optionsCaption: '-Select-'"></select></td>
				</tr>
			</table>
		</div>
				
		<div id="divResponseInfo" data-bind="with: currentResponse">
			<fieldset>
				<legend>Response Information</legend>
				<table id="tblResponseInfo" class="tablesorter">
					<tbody>
						<tr>
							<td>Request #</td>
							<td><span id="requestInfoNum" data-bind="text: number"></span></td>
						</tr>
						<tr>
							<td>Request Status</td>
							<td>
								<span id="requestInfoStatus" data-bind="text: request.status, style: { color:   request.status == 'Closed' ? 'red' : 'green' }"></span>
								<span data-bind="visible: request.status == 'Closed', style: { color: 'red'}">on <span data-bind="text: closedDate, style: { color: 'red'}"></span> </span>
							</td>
						</tr>
						<tr>
							<td>Subject</td>
							<td><span id="requestInfoSub" data-bind="text: request.subject"></span></td>
						</tr>
						<tr>
							<td>Due Date</td>
							<td><span id="requestInfoInternalDueDate" data-bind="text: request.internalDueDate"></span></td>
						</tr>
						<tr>
							<td>Sample?</td>
							<td><span id="requestInfoSample" data-bind="text: request.sample, css: request.sample == true ? 'ui-icon ui-icon-check' : 'ui-icon ui-icon-close'"></span></td>
						</tr>
						<tr>
							<td>Response</td>
							<td><span id="responseInfoName" data-bind="text: title"></span></td>
						</tr>
						<tr>
							<td>Response Status</td>
							<td>
								<span id="responseInfoStatus" data-bind="style: { color:  resStatus == '7-Closed' ? 'red' : 'green' }">
									<span data-bind="text: resStatus"></span><span data-bind="visible: resStatus == '7-Closed'"> on <span data-bind="text: closedDate "></span> by <span data-bind="text: closedBy"></span> </span>
								</span>
							</td>
						</tr>
						<tr>
							<td>Sample #</td>
							<td><span id="responseInfoSampleNum" data-bind="text: sample"></span></td>
						</tr>
						<tr>
							<td>Action Office</td>
							<td><span id="responseInfoAO" data-bind="text: actionOffice"></span></td>
						</tr>
						<tr>
							<td>Related Audit</td>
							<td><span id="requestInfoRelatedAudit" data-bind="text: request.relatedAudit"></span></td>
						</tr>
						<tr>
							<td>Action Items</td>
							<td><span id="requestInfoActionItems" data-bind="html: request.actionItems"></span></td>
						</tr>
						<tr>
							<td>Comments</td>
							<td><span id="responseInfoComments" data-bind="html: comments"></span></td>
						</tr>
					</tbody>
				</table>
			</fieldset>
		</div>

				
		<div id="divCoverSheets" data-bind="visible: currentResponse">
			<fieldset><legend>Cover Sheets/Supplemental Documents</legend>

				<div id="divEmptyCoversheetsMsg" style="border:0px !important; font-style:italic;"  data-bind="visible: arrCoverSheets().length <= 0">There are 0 cover sheets or supplemental documents</div>
				<table id="tblCoverSheets" class="tablesorter report" data-bind="visible: arrCoverSheets().length > 0">
					<thead>				
						<tr valign="top">
							<th class="sorter-false" nowrap="nowrap">Name</th>
						</tr>
					</thead>
					<tbody data-bind="foreach: arrCoverSheets">					
						<tr class="coversheet-item"><td class="coversheet-title" title="Click to Download"><a data-bind="downloadLink: '../_layouts/download.aspx?SourceUrl=:folder/:fileName'"><span data-bind="text: fileName"></span></a></td></tr>
					</tbody>
					<tfoot>
						<tr valign="top">
							<th nowrap="nowrap">Total: <span id="tblCoverSheetsTotal" data-bind="text: arrCoverSheets().length">0</span></th>
						</tr>
					</tfoot>
				</table>
			</fieldset>
		</div>
		
		<div>
			<fieldset class="divCloseResponse" style="border-color:GreenYellow" data-bind="visible: currentResponse && showCloseResponse"><legend style="font-weight:bold; font-size:10pt;">Action</legend>
				<a class="btnCloseResponse" href="javascript:void(0)" title="Click to Close Response" style="font-size:11pt" data-bind="click: ClickCloseResponse"><span class='ui-icon ui-icon-gear'></span>Close Response</a>
			</fieldset>
			<fieldset class="divReturnToCGFS" style="border-color:GreenYellow" data-bind="visible: currentResponse && showReturnToCGFS"><legend style="font-weight:bold; font-size:10pt;">Action</legend>
				<a class="btnReturnToCGFS" href="javascript:void(0)" title="Click to Return to CGFS" data-bind="click: ClickReturnToCGFS"><span class='ui-icon ui-icon-gear'></span>Return to CGFS</a>
			</fieldset>
			<fieldset class="divBulkApprove" data-bind="visible: currentResponse && showBulkApprove"><legend>Action</legend>
				<a class="btnApproveAll" href="javascript:void(0)" title="Click to Approve Remaining Documents" data-bind="click: ClickBulkApprove"><span class='ui-icon ui-icon-circle-check'></span>Approve All Documents</a>
			</fieldset>
		</div>


		<div id="divResponseDocs" data-bind="visible: currentResponse">
			<fieldset>
				<legend>Response Documents</legend>
				<div id="divEmptyResponseDocsMsg" style="border:0px !important; font-style:italic;" data-bind="visible: cntResponseDocs() == 0">There are 0 response documents</div>
				<table id="tblResponseDocs" class="tablesorter report" data-bind="visible: cntResponseDocs() > 0">
					<thead>				
						<tr valign="top">
							<th class="sorter-false" nowrap="nowrap">Type</th>
							<th class="sorter-false" nowrap="nowrap">Name</th>
							<th class="sorter-false" nowrap="nowrap">Receipt Date</th>
							<th class="sorter-false" nowrap="nowrap">File Size</th>
							<th class="sorter-false" nowrap="nowrap">Status <span><a title="View Help" href="javascript:void(0)" style="color:#0072bc" data-bind="click: ClickHelpResponseDocs"><span class="ui-icon ui-icon-help"></span></a></span></th>
							<th class="sorter-false" nowrap="nowrap">Reason</th>
							<th class="sorter-false" nowrap="nowrap">Action <span><a title="View Help" href="javascript:void(0)" style="color:#0072bc" data-bind="click: ClickHelpResponseDocs"><span class="ui-icon ui-icon-help"></span></a></span></th>
							<th class="sorter-false" nowrap="nowrap">Modified</th>
							<th class="sorter-false" nowrap="nowrap">Modified By</th>
						</tr>
					</thead>
					<tbody data-bind="with: arrResponseDocs">
						<tr class="requestInfo-response-doc">
							<td colspan="10">
								<img style="background-color: transparent;" src="/_layouts/images/minus.gif" title="Expand/Collapse" data-bind="toggleClick: $data, toggleClass: 'collapsed', containerType: 'doc', classContainer: '.requestInfo-response-doc'"/><span data-bind="text: responseTitle"></span>
							</td>
						</tr>
						
						<!-- ko foreach: responseDocs-->											
						   
						<tr class="requestInfo-response-doc-item" data-bind="style: styleTag">
							<td><img data-bind="attr:{ src: $parent.siteUrl + '/_layouts/images/' + docIcon}"></img></td>
							<td class="requestInfo-response-doc-title" title="Click to Download"><a data-bind="downloadLink: '../_layouts/download.aspx?SourceUrl=:folder/:fileName'"><span data-bind="text: fileName"></span></a></td>
							<td nowrap data-bind="text: receiptDate"></td>
							<td nowrap data-bind="text: fileSize"></td>
							<td nowrap data-bind="text: documentStatus"></td>
							<td data-bind="html: rejectReason"></td>
							<td nowrap>
								<span data-bind="visible: ($parent.responseStatus == '4-Approved for QA' || $parent.responseStatus == '6-Reposted After Rejection') && documentStatus == 'Sent to QA'" >
									<a title="Approve this Document" href="javascript:void(0)" data-bind="click: $root.ClickApproveResponseDoc"><span class='ui-icon ui-icon-circle-check'>Approve Response Doc</span></a>
									<a title="Reject this Document" href="javascript:void(0)" data-bind="click: $root.ClickRejectResponseDoc"><span class='ui-icon ui-icon-circle-close'>Reject Response Doc</span></a>
								</span>
							</td>
							<td class="requestInfo-response-doc-modified" data-bind="text: modifiedDate"></td>
							<td class="requestInfo-response-doc-modifiedBy" data-bind="text: modifiedBy"></td>
						</tr>
					
						<!-- /ko -->
	
					</tbody>
					<tfoot>
						<tr valign="top">
							<th colspan="9" nowrap="nowrap">Total: <span id="tblResponseDocsTotal" data-bind="text: cntResponseDocs">0</span></th>
						</tr>
					</tfoot>
				</table>
			</fieldset>
		</div>
		
		<div class="divReturnToCGFS" data-bind="visible: currentResponse && showReturnToCGFS">
			<fieldset style="border-color:GreenYellow"><legend style="font-weight:bold; font-size:10pt;">Action</legend>
				<span class='ui-icon ui-icon-gear'></span><a class="btnReturnToCGFS" href="javascript:void(0)" title="Click to Return to CGFS" data-bind="click: ClickReturnToCGFS">Return to CGFS</a>
			</fieldset>
		</div>
		
	</div>
</div>

<script id="responseTemplate" type="text/x-jsrender">
	<tr class="sr-response-item {{if highlight}}highlighted{{/if}}" style="display:none">
		<td class="sr-response-requestNum">{{:reqNumber}}</td>
		<td class="sr-response-requestSubject">{{:requestSubject}}</td>
		<td class="sr-response-requestStatus">{{:requestStatus}}</td>
		<td class="sr-response-internalDueDate">{{:internalDueDate}}</td>
		<td class="sr-response-sample">{{:sample}}</td>
		<td class="sr-response-title"><a href="javascript:void(0);" title='Go to Response Details' onclick='Audit.QAReport.Report.GoToResponse("{{:title}}")'>{{:title}}</a></td>
		<td class="sr-response-status">{{:status}}</td>
		<td class="sr-response-docCount">{{:docCount}}</td>
		<td class="sr-response-modified">{{:modified}}</td>
	</tr>
</script>



<div id="divTest"></div>

<link rel="stylesheet" type="text/css" href="../SiteAssets/css/jqueryui/1.11.3/themes/redmond/jquery-ui.min.css"  />
<link rel="stylesheet" type="text/css" href="../SiteAssets/css/tablesorter/style.css"  />
<link rel="stylesheet" type="text/css" href="../SiteAssets/css/Audit_Styles.css"/>
<link rel="stylesheet" type="text/css" href="../SiteAssets/css/Audit_Page_Reports.css"/>

<script type="text/javascript" src="../SiteAssets/js/jquery/1.7.2/jquery.min.js"></script>
<script type="text/javascript" src="../SiteAssets/js/jqueryui/1.11.3/jquery-ui.min.js"></script>
<script type="text/javascript" src="../SiteAssets/js/jquery.tablesorter.min.js" ></script>
<script type="text/javascript" src="../SiteAssets/js/jsrender.min.js"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.2/knockout-min.js"></script>

<script type="text/javascript" src="../SiteAssets/js/Audit_Page_Common.js"></script>
<script type="text/javascript" src="../SiteAssets/js/Audit_Page_KO_DB_QA.js"></script>


