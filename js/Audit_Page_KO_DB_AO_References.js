﻿<iframe id="CsvExpFrame" style="display: none"></iframe>

<div id="divCounter" style="display:none" title="used to auto refresh the page">600</div>

<div id="divRefresh" style="display:none">
	<div>
		<a title="Refresh this page" href="javascript:void(0)" onclick="Audit.Common.Utilities.Refresh()"><span class="ui-icon ui-icon-refresh"></span>Refresh</a>
	</div>
	<div>
		<a title="View User Manual" href="javascript:void(0)" onclick="Audit.Common.Utilities.ViewUserManuals('AO User Manual')"><span class="ui-icon ui-icon-help"></span>User Manual</a>
	</div>
	<div style="padding-bottom:10px">
		<a title="Help" href="mailto:cgfsauditrequests@state.gov"><span class="ui-icon ui-icon-mail-closed"></span>Request Help</a>
	</div>
</div>

<div id="divLoading" style="color:green; padding-bottom:10px">Please Wait... Loading <span data-bind="visible: arrResponses().length > 0 && debugMode, text: arrResponses().length"></span></div>
<div id="divUsersGroups" style="color:green; padding-bottom:10px"></div>


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
			<table id="tblStatusReportResponses" class="tablesorter report" data-bind="visible: arrResponses().length > 0">
				<thead>
					<tr valign="top" class="rowFilters" data-bind="visible: arrResponses().length > 0">
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseName" data-bind="options: $root.ddOptionsResponseTabResponseTitle, value: filterResponseTabResponseName, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false" nowrap="nowrap"></th>
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseRequestInternalDueDate" data-bind="options: $root.ddOptionsResponseTabRequestInternalDueDate, value: filterResponseTabRequestIntDueDate, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false" nowrap="nowrap"><select id="ddlResponseStatus" data-bind="options: $root.ddOptionsResponseTabResponseStatus, value: filterResponseTabResponseStatus, optionsCaption: '-Select-'"></select></th>
						<th class="sorter-false"></th>
						<th class="sorter-false"></th>
					</tr>
					<tr valign="top">
						<th class="sorter-true" nowrap="nowrap">Response Name</th>
						<th class="sorter-false" nowrap="nowrap">Response Subject</th>
						<th class="sorter-true" nowrap="nowrap">Due Date</th>
						<th class="sorter-true" nowrap="nowrap">Response Status</th>
						<th class="sorter-true" nowrap="nowrap"># of Documents</th>
						<th class="sorter-true" nowrap="nowrap">Modified</th>
					</tr>
				</thead>
				<tbody id="fbody"></tbody>
				<tfoot class="footer">
					<tr>
						<th colspan="6">Displaying <span id="spanResponsesDisplayedTotal" style="color:green" data-bind="text: arrFilteredResponsesCount()">0</span> out of <span id="spanResponsesTotal" style="color:green" data-bind="text: arrResponses().length">0</span> Responses</th>
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
							<td>Response</td>
							<td><span id="responseInfoName" data-bind="text: title"></span></td>
						</tr>
						<tr>
							<td>Subject</td>
							<td><span id="requestInfoSubject" data-bind="text: request.subject"></span></td>
						</tr>
						<tr>
							<td>Due Date</td>
							<td><span id="requestInfoInternalDueDate" data-bind="text: request.internalDueDate"></span></td>
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
							<td>Action Office</td>
							<td><span id="responseInfoAO" data-bind="text: actionOffice"></span> <span data-bind="visible: poc" style="color:green">POC: </span><span data-bind="text: poc" style="color:green"></span></td>
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

			<div id="divEmptyCoversheetsMsg" style="border:0px !important; font-style:italic;" data-bind="visible: arrCoverSheets().length <= 0">There are 0 cover sheets or supplemental documents</div>
			<table id="tblCoverSheets" class="tablesorter report" data-bind="visible: arrCoverSheets().length > 0">
				<thead>				
					<tr valign="top">
						<th class="sorter-false" nowrap="nowrap">Name</th>
					</tr>
				</thead>
					<tbody data-bind="foreach: arrCoverSheets">					
						<tr class="coversheet-item"><td class="coversheet-title" title="Click to Download"><a data-bind="attr: { href: 'javascript:void(0)', onclick: link}"><span data-bind="text: title"></span></a></td></tr>
					</tbody>
				<tfoot>
					<tr valign="top">
						<th nowrap="nowrap">Total: <span id="tblCoverSheetsTotal" data-bind="text: arrCoverSheets().length">0</span></th>
					</tr>
				</tfoot>
			</table>
			</fieldset>
		</div>
		
		<div class="divSubmit" data-bind="visible: currentResponse && showSubmit">
			<fieldset style="border-color:GreenYellow"><legend style="font-weight:bold; font-size:11pt;">SUBMIT RESPONSE</legend>
				<div style="padding-top:15px; padding-bottom:15px;">
					<span class='ui-icon ui-icon-disk'></span><a class="btnSubmitPackage" href="javascript:void(0)" title="Click to Submit the Response Package" data-bind="click: ClickSubmitResponse">Submit this Response Package</a>
				</div>
			</fieldset>
		</div>
		
		<div id="divResponseDocs" data-bind="visible: currentResponse">
			<fieldset><legend>Response Documents</legend>

				<div class="divUpload" data-bind="visible: showUpload()"><a title='Upload Response Documents' href='javascript:void(0)' data-bind="click:ClickUploadResponseDoc"><span class='ui-icon ui-icon-circle-arrow-n'></span>Upload Response Document</a></div>
				<table id="tblResponseDocs" class="tablesorter report" data-bind="visible: cntResponseDocs() > 0">
					<thead>				
						<tr valign="top">
							<th class="sorter-false" nowrap="nowrap">Type</th>
							<th class="sorter-false" nowrap="nowrap">Name</th>
							<th class="sorter-false" nowrap="nowrap">Title</th>
							<th class="sorter-false" nowrap="nowrap">Receipt Date</th>
							<th class="sorter-false" nowrap="nowrap">File Size</th>
							<th class="sorter-false" nowrap="nowrap">Modified</th>
							<th class="sorter-false" nowrap="nowrap">Modified By</th>
						</tr>
					</thead>
					<tbody data-bind="with: arrResponseDocs">
						
						<tr class="requestInfo-response-doc" >
							<td colspan="10">
								<img style="background-color: transparent;" src="/_layouts/images/minus.gif" title="Expand/Collapse" data-bind="toggleClick: $data, toggleClass: 'collapsed', containerType: 'doc', classContainer: '.requestInfo-response-doc'"/><span data-bind="text: responseTitle"></span>
							</td>
						</tr>

						
						<!-- ko foreach: responseDocs-->											
						   
						<tr class="requestInfo-response-doc-item" data-bind="style: styleTag">
							<td><img data-bind="attr:{ src: $parent.siteUrl + '/_layouts/images/' + docIcon}"></img></td>
							<td class="requestInfo-response-doc-title" title="Click to Download">
								<a data-bind="downloadLink: '../_layouts/download.aspx?SourceUrl=:folder/:fileName'"><span data-bind="text: fileName"></span></a>
								<span style="float:right" data-bind="visible: ($parent.responseStatus == '1-Open' || $parent.responseStatus == '3-Returned to Action Office') && documentStatus == 'Open'" >
									<a title="Delete Response Document" href="javascript:void(0)" data-bind="click:  $root.ClickMarkForDeletionResponseDoc"><span class="ui-icon ui-icon-trash">Delete Response Document</span></a>
								</span>
							</td>
							<td nowrap data-bind="text: title"></td>
							<td nowrap data-bind="text: receiptDate"></td>
							<td nowrap data-bind="text: fileSize"></td>
							<td class="requestInfo-response-doc-modified" data-bind="text: modifiedDate"></td>
							<td class="requestInfo-response-doc-modifiedBy" data-bind="text: modifiedBy"></td>
						</tr>
					
						<!-- /ko -->
	
					</tbody>
					<tfoot>
						<tr valign="top">
							<th colspan="7" nowrap="nowrap">Total: <span id="tblResponseDocsTotal" data-bind="text: cntResponseDocs">0</span></th>
						</tr>
					</tfoot>
				</table>
				
				<div class="divUpload" data-bind="visible: showUpload() && cntResponseDocs() > 0"><a title='Upload Response Documents' href='javascript:void(0)' data-bind="click:ClickUploadResponseDoc"><span class='ui-icon ui-icon-circle-arrow-n'></span>Upload Response Document</a></div>
			
			</fieldset>
		</div>
	</div>
</div>


<script id="responseTemplate" type="text/x-jsrender">
	<tr class="sr-response-item {{if highlight}}highlighted{{/if}}" style="display:none">
		<td class="sr-response-title"><a href="javascript:void(0);" title='Go to Response Details' onclick='Audit.AOReport.Report.GoToResponse("{{:title}}")'>{{:title}}</a></td>
		<td class="sr-response-requestSubject">{{:requestSubject}}</td>
		<td class="sr-response-internalDueDate">{{:internalDueDate}}</td>
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
<script type="text/javascript" src="../SiteAssets/js/Audit_Page_KO_DB_AO.js"></script>

