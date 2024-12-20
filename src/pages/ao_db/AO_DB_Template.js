﻿const html = String.raw;

export const aoDbTemplate = html`
  <iframe id="CsvExpFrame" style="display: none"></iframe>

  <div
    id="divCounter"
    style="display: none"
    title="used to auto refresh the page"
  >
    600
  </div>

  <div class="audit">
    <!-- ko with: blockingTasks -->
    <div
      class="tasks blocking dimmer"
      data-bind="css: {'active': $data.length}"
    >
      <span class="loader"></span>
      <ul class="" data-bind="foreach: $data">
        <li data-bind="text: msg + '... ' + Status()"></li>
      </ul>
    </div>
    <!-- /ko -->

    <!-- ko with: runningTasks -->
    <div class="tasks running">
      <ul class="" data-bind="foreach: $data">
        <li data-bind="text: msg + '... ' + Status()"></li>
      </ul>
    </div>
    <!-- /ko -->
    <div id="divLoading" style="color: green; padding-bottom: 10px">
      Please Wait... Loading
      <span
        data-bind="visible: arrResponses().length > 0 && debugMode, text: arrResponses().length"
      ></span>
    </div>
    <div id="divUsersGroups" style="color: green; padding-bottom: 10px"></div>
    <div class="audit-body">
      <div class="reports-container">
        <div id="divRefresh" class="quick-links" style="display: none">
          <div>
            <a
              title="Refresh this page"
              href="javascript:void(0)"
              data-bind="click: refresh"
              ><span class="ui-icon ui-icon-refresh"></span>Refresh</a
            >
          </div>
          <div>
            <a
              title="View User Manual"
              href="javascript:void(0)"
              onclick="Audit.Common.Utilities.ViewUserManuals('AO User Manual')"
              ><span class="ui-icon ui-icon-help"></span>User Manual</a
            >
          </div>
          <div>
            <a title="Help" href="mailto:cgfsauditrequests@state.gov"
              ><span class="ui-icon ui-icon-mail-closed"></span>Request Help</a
            >
          </div>
        </div>
        <div id="" style="margin-top: 20px">
          <!-- ko using: tabs -->
          <ul class="ui-tabs-nav" data-bind="foreach: tabOpts">
            <li
              data-bind="text: linkText, 
            click: $parent.clickTabLink, 
            css: {active: $parent.isSelected($data)}"
            ></li>
          </ul>
          <!-- ko foreach: tabOpts -->
          <div
            data-bind="template: {
              name: template.id,
              data: template.data
            },
            visible: $parent.isSelected($data)"
          ></div>
          <!-- /ko -->
          <!-- /ko -->
        </div>
      </div>
    </div>
  </div>

  <script type="text/html" id="responseStatusReportTemplate">
    <div id="tabs-0">
      <div
        id="lblStatusReportResponsesMsg"
        style="padding-top: 5px; color: green"
      >
        <span
          data-bind="css: (cntPendingReview() > 0 ? 'ui-icon ui-icon-alert' : 'ui-icon ui-icon-circle-check')"
        ></span
        >There are <span data-bind="text: cntPendingReview"></span> Responses
        pending your review
      </div>
      <div
        id="divButtons"
        style="padding-top: 3px"
        data-bind="visible: arrResponses().length > 0"
      >
        <a
          id="btnPrint1"
          title="Click here to Print"
          href="javascript:void(0)"
          class="hideOnPrint"
          ><span class="ui-icon ui-icon-print">Print</span></a
        >
        <a class="export1 hideOnPrint" title="Export to CSV" href="#"
          ><span class="ui-icon ui-icon-disk">Export to CSV</span></a
        >
        <a
          id="btnViewAll"
          title="View All"
          href="javascript:void(0)"
          data-bind="visible: arrFilteredResponsesCount() < arrResponses().length && doSort, click: ClearFiltersResponseTab"
          ><span class="ui-icon ui-icon-circle-zoomout"></span>View All
          Responses</a
        >
      </div>

      <div id="divStatusReportRespones">
        <table
          id="tblStatusReportResponses"
          class="tablesorter report"
          data-bind="visible: arrResponses().length > 0"
        >
          <thead>
            <tr
              valign="top"
              class="rowFilters"
              data-bind="visible: arrResponses().length > 0"
            >
              <th class="sorter-false filter" nowrap="nowrap">
                <select
                  id="ddlResponseName"
                  data-bind="options: $root.ddOptionsResponseTabResponseTitle, value: filterResponseTabResponseName, optionsCaption: '-Select-'"
                ></select>
              </th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false filter" nowrap="nowrap">
                <select
                  id="ddlResponseRequestInternalDueDate"
                  data-bind="options: $root.ddOptionsResponseTabRequestInternalDueDate, value: filterResponseTabRequestIntDueDate, optionsCaption: '-Select-'"
                ></select>
              </th>
              <th class="sorter-false filter" nowrap="nowrap">
                <select
                  id="ddlResponseStatus"
                  data-bind="options: $root.ddOptionsResponseTabResponseStatus, value: filterResponseTabResponseStatus, optionsCaption: '-Select-'"
                ></select>
              </th>
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
          <tbody id="fbody">
            <!-- ko foreach: arrResponses -->
            <tr
              class="sr-response-item"
              data-bind="css: {'highlighted': highlight}"
            >
              <td class="sr-response-title">
                <a
                  href="javascript:void(0);"
                  title="Go to Response Details"
                  data-bind="text: title,
          click: () => Audit.AOReport.Report.GoToResponse(title)"
                >
                </a>
              </td>
              <td
                class="sr-response-requestSubject"
                data-bind="text: requestSubject"
              ></td>
              <td
                class="sr-response-internalDueDate"
                data-bind="text: internalDueDate"
              ></td>
              <td class="sr-response-status" data-bind="text: status"></td>
              <td class="sr-response-docCount" data-bind="text: docCount"></td>
              <td class="sr-response-modified" data-bind="text: modified"></td>
            </tr>
            <!-- /ko -->
          </tbody>
          <tfoot class="footer">
            <tr>
              <th colspan="6">
                Displaying
                <span
                  id="spanResponsesDisplayedTotal"
                  style="color: green"
                  data-bind="text: arrFilteredResponsesCount()"
                  >0</span
                >
                out of
                <span
                  id="spanResponsesTotal"
                  style="color: green"
                  data-bind="text: arrResponses().length"
                  >0</span
                >
                Responses
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </script>

  <script type="text/html" id="responseDetailTemplate">
    <div id="tabs-1">
      <div style="padding-bottom: 15px">
        <table>
          <tr>
            <td><span>Responses Pending Action:</span></td>
            <td>
              <select
                id="ddlResponsesOpen"
                data-bind="options: $root.ddOptionsResponseInfoTabResponseNameOpen2, value: filterResponseInfoTabResponseNameOpen2, optionsCaption: '-Select-'"
              ></select>
            </td>
          </tr>
          <tr>
            <td><span>Other Responses:</span></td>
            <td>
              <select
                id="ddlResponsesProcessed"
                data-bind="options: $root.ddOptionsResponseInfoTabResponseNameProcessed2, value: filterResponseInfoTabResponseNameProcessed2, optionsCaption: '-Select-'"
              ></select>
            </td>
          </tr>
        </table>
      </div>
      <div class="response-detail-view">
        <div
          id="divResponseInfo"
          class="audit-form response-info-form"
          data-bind="with: currentResponse"
        >
          <div class="form-header">
            <h3 class="uppercase form-title">
              AUDIT RESPONSE DETAILS
              <div class="fw-semibold" data-bind="text: title"></div>
            </h3>
            <!-- <button
          type="button"
          class="btn btn-link form-title"
          data-bind="click: $parent.refreshRequest"
        >
          <i title="Refresh Request" class="fa-solid fa-arrows-rotate"></i>
        </button> -->
          </div>

          <div class="form-row uppercase">
            <dl>
              <dt>Subject</dt>
              <dd>
                <span
                  id="requestInfoSubject"
                  data-bind="text: request.subject"
                ></span>
              </dd>
              <dt>Due Date</dt>
              <dd>
                <span
                  id="requestInfoInternalDueDate"
                  data-bind="text: request.internalDueDate"
                ></span>
              </dd>
            </dl>
            <dl>
              <dt>Response Status</dt>
              <dd>
                <span
                  id="responseInfoStatus"
                  data-bind="style: { color:  resStatus == '7-Closed' ? 'red' : 'green' }"
                >
                  <span data-bind="text: resStatus"></span
                  ><span data-bind="visible: resStatus == '7-Closed'">
                    on <span data-bind="text: closedDate "></span> by
                    <span data-bind="text: closedBy"></span>
                  </span>
                </span>
              </dd>
              <dt>Action Office</dt>
              <dd>
                <span id="responseInfoAO" data-bind="text: actionOffice"></span>
                <span data-bind="visible: poc" style="color: green">POC: </span
                ><span data-bind="text: poc" style="color: green"></span>
              </dd>
              <dt>Related Audit</dt>
              <dd>
                <span
                  id="requestInfoRelatedAudit"
                  data-bind="text: request.relatedAudit"
                ></span>
              </dd>
            </dl>
          </div>
          <div class="form-row uppercase">
            <dl>
              <dt>Action Items</dt>
              <dd>
                <span
                  id="requestInfoActionItems"
                  data-bind="html: request.actionItems"
                ></span>
              </dd>
              <dt>Comments</dt>
              <dd>
                <span
                  id="responseInfoComments"
                  data-bind="html: comments"
                ></span>
              </dd>
            </dl>
          </div>
        </div>

        <div>
          <div id="divCoverSheets" data-bind="visible: currentResponse">
            <fieldset>
              <legend>Cover Sheets/Supplemental Documents</legend>

              <div
                id="divEmptyCoversheetsMsg"
                style="border: 0px !important; font-style: italic"
                data-bind="visible: arrCoverSheets().length <= 0"
              >
                There are 0 cover sheets or supplemental documents
              </div>
              <table
                id="tblCoverSheets"
                class="tablesorter report"
                data-bind="visible: arrCoverSheets().length > 0"
              >
                <thead>
                  <tr valign="top">
                    <th class="sorter-false" nowrap="nowrap">Name</th>
                  </tr>
                </thead>
                <tbody data-bind="foreach: arrCoverSheets">
                  <tr class="coversheet-item">
                    <td class="coversheet-title" title="Click to Download">
                      <a
                        data-bind="attr: { href: 'javascript:void(0)', onclick: link}"
                        ><span data-bind="text: title"></span
                      ></a>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr valign="top">
                    <th nowrap="nowrap">
                      Total:
                      <span
                        id="tblCoverSheetsTotal"
                        data-bind="text: arrCoverSheets().length"
                        >0</span
                      >
                    </th>
                  </tr>
                </tfoot>
              </table>
            </fieldset>
          </div>

          <div
            class="divSubmit"
            data-bind="visible: currentResponse && showSubmit"
          >
            <fieldset style="border-color: GreenYellow">
              <legend style="font-weight: bold; font-size: 11pt">
                SUBMIT RESPONSE
              </legend>
              <div style="padding-top: 15px; padding-bottom: 15px">
                <span class="ui-icon ui-icon-disk"></span
                ><a
                  class="btnSubmitPackage"
                  href="javascript:void(0)"
                  title="Click to Submit the Response Package"
                  data-bind="click: ClickSubmitResponse"
                  >Submit this Response Package</a
                >
              </div>
            </fieldset>
          </div>

          <div id="divResponseDocs" data-bind="visible: currentResponse">
            <fieldset>
              <legend>Response Documents</legend>

              <table
                id="tblResponseDocs"
                class="tablesorter report"
                data-bind="visible: cntResponseDocs() > 0"
              >
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
                  <tr class="requestInfo-response-doc">
                    <td colspan="10">
                      <img
                        style="background-color: transparent"
                        src="/_layouts/images/minus.gif"
                        title="Expand/Collapse"
                        data-bind="toggleClick: $data, toggleClass: 'collapsed', containerType: 'doc', classContainer: '.requestInfo-response-doc'"
                      /><span data-bind="text: responseTitle"></span>
                    </td>
                  </tr>

                  <!-- ko foreach: responseDocs-->

                  <tr
                    class="requestInfo-response-doc-item"
                    data-bind="style: styleTag"
                  >
                    <td>
                      <img
                        data-bind="attr:{ src: $parent.siteUrl + '/_layouts/images/' + docIcon}"
                      />
                    </td>
                    <td
                      class="requestInfo-response-doc-title"
                      title="Click to Download"
                    >
                      <a
                        data-bind="downloadLink: '../_layouts/download.aspx?SourceUrl=:folder/:fileName'"
                        ><span data-bind="text: fileName"></span
                      ></a>
                      <span
                        style="float: right"
                        data-bind="visible: ($parent.responseStatus == '1-Open' || $parent.responseStatus == '3-Returned to Action Office') && documentStatus == 'Open'"
                      >
                        <a
                          title="Delete Response Document"
                          href="javascript:void(0)"
                          data-bind="click:  $root.ClickMarkForDeletionResponseDoc"
                          ><span class="ui-icon ui-icon-trash"
                            >Delete Response Document</span
                          ></a
                        >
                      </span>
                    </td>
                    <td nowrap data-bind="text: title"></td>
                    <td nowrap data-bind="text: receiptDate"></td>
                    <td nowrap data-bind="text: fileSize"></td>
                    <td
                      class="requestInfo-response-doc-modified"
                      data-bind="text: modifiedDate"
                    ></td>
                    <td
                      class="requestInfo-response-doc-modifiedBy"
                      data-bind="text: modifiedBy"
                    ></td>
                  </tr>

                  <!-- /ko -->
                </tbody>
                <tfoot>
                  <tr valign="top">
                    <th colspan="7" nowrap="nowrap">
                      Total:
                      <span
                        id="tblResponseDocsTotal"
                        data-bind="text: cntResponseDocs"
                        >0</span
                      >
                    </th>
                  </tr>
                </tfoot>
              </table>
              <div class="divUpload" data-bind="visible: showUpload()">
                <label class="file-upload-field">
                  Upload Response Documents:
                  <div class="dropzone" data-bind="">Drop Files Here</div>
                  <input
                    class="file-upload"
                    type="file"
                    multiple
                    data-bind="files: responseDocFiles"
                  />
                </label>
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  </script>

  <div id="divTest"></div>
`;
