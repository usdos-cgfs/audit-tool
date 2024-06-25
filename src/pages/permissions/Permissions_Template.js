﻿const html = String.raw;

export const permissionsTemplate = html`
  <link
    rel="stylesheet"
    type="text/css"
    href="/sites/CGFS/Style Library/apps/audit/lib/jquery-ui-1.13.2/jquery-ui.theme.min.css"
  />
  <link
    rel="stylesheet"
    type="text/css"
    href="/sites/CGFS/Style Library/apps/audit/lib/tablesorter-2.31.3/css/theme.default.min.css"
  />

  <div class="audit">
    <iframe id="CsvExpFrame" style="display: none"></iframe>

    <div style="padding-bottom: 10px">
      <a
        id="btnRefresh"
        title="Refresh this page"
        style="display: none"
        href="javascript:void(0)"
        onclick="Audit.Permissions.Report.Refresh()"
        ><span class="ui-icon ui-icon-refresh"></span>Refresh</a
      >
    </div>

    <div id="divLoading" style="color: green; padding-bottom: 10px">
      Please Wait... Loading
    </div>

    <div id="divErrorMsg" style="color: red; padding-bottom: 10px"></div>

    <div id="tabs" style="display: none; margin-top: 20px">
      <ul>
        <li><a href="#tabs-0">Action Office Groups and Users</a></li>
        <li><a href="#tabs-1">Site Groups and Users</a></li>
        <li style="display: none"><a href="#tabs-2">Request Permissions</a></li>
        <li style="display: none">
          <a href="#tabs-3">Response Permissions</a>
        </li>
        <li style="display: none">
          <a href="#tabs-4">Response Folder Permissions</a>
        </li>
      </ul>

      <div id="tabs-0">
        <fieldset style="width: 300px">
          <legend>Actions</legend>
          <a
            style="display: none"
            id="btnPrint"
            title="Click here to Print"
            href="javascript:void(0)"
            class="hideOnPrint"
            ><span class="ui-icon ui-icon-print">Print</span></a
          >
          <a
            style="display: none"
            class="export hideOnPrint"
            title="Export to CSV"
            href="#"
            ><span class="ui-icon ui-icon-disk">Export to CSV</span></a
          >

          <div>
            <a
              id="linkGetVerification"
              title="Select Action Office(s) to Obtain Verification of User"
              disabled="disabled"
              href="javascript:void(0)"
              ><span class="ui-icon ui-icon-gear"></span>Obtain Action Office
              Verification</a
            >
          </div>
          <div>
            <a
              id="linkEmailHistory"
              title="View Email History"
              href="javascript:void(0)"
              ><span class="ui-icon ui-icon-search"></span>View Email History</a
            >
          </div>
          <div>
            <a
              id="linkUploadPermissions"
              title="Import Users to SharePoint Groups"
              href="javascript:void(0)"
              ><span class="ui-icon ui-icon-person"></span>Import Users into
              Groups</a
            >
          </div>
          <div>
            <a
              id="linkViewAO"
              title="View Action Offices"
              href="javascript:void(0)"
              ><span class="ui-icon ui-icon-search"></span>View Action Office
              Details</a
            >
          </div>
          <div>
            <a
              title="Add Action Office"
              href="#"
              id="linkAddAO"
              title="Add Action Office"
              ><span class="ui-icon ui-icon-circle-plus"></span>Add Action
              Office</a
            >
          </div>
        </fieldset>
        <div id="divTblOutput" style="width: 100%; padding-bottom: 10px">
          <table id="table_Groups" class="tablesorter">
            <thead>
              <tr>
                <th class="removeOnExport">
                  <input
                    class="cbAOAll"
                    id="cbAOAll"
                    type="checkbox"
                    style="cursor: pointer"
                  />
                  Check All?
                </th>
                <th>Action Office</th>
                <th>SharePoint Group Name</th>
                <th>
                  Users<a
                    id="linkViewExportFriendly"
                    style="float: right"
                    title="View Export Friendly"
                    href="javascript:void(0)"
                    ><span class="ui-icon ui-icon-gear"></span>View Export
                    Friendly</a
                  >
                </th>
              </tr>
            </thead>
            <tbody id="fbody"></tbody>
            <tfoot>
              <tr>
                <th colspan="4" style="text-align: left; white-space: nowrap">
                  Total: <span id="spanTotalAOS">0</span>
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div id="tabs-1">
        <div
          id="divTblSiteUsersOutput"
          style="width: 100%; padding-bottom: 10px"
        >
          <table id="table_SiteGroups" class="tablesorter">
            <thead>
              <tr>
                <th>SharePoint Group Name</th>
                <th>Users</th>
              </tr>
            </thead>
            <tbody id="fbodySPGroups"></tbody>
          </table>
        </div>
      </div>

      <div id="tabs-2">
        <table id="tblRequestsPermissions" class="tablesorter">
          <thead>
            <tr valign="top">
              <th class="sorter-false" nowrap="nowrap">
                <select id="ddlRequestID"></select>
              </th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
            </tr>
            <tr valign="top">
              <th class="sorter-false" nowrap="nowrap">Request Number</th>
              <th class="sorter-false" nowrap="nowrap">Status</th>
              <th class="sorter-false" nowrap="nowrap">Action Offices(s)</th>
              <th class="sorter-false" nowrap="nowrap">Special Perms?</th>
              <th class="sorter-false" nowrap="nowrap">Permissions</th>
            </tr>
          </thead>
          <tbody></tbody>
          <tfoot>
            <tr valign="top">
              <th nowrap="nowrap" colspan="5">
                Total: <span id="tblRequestsPermsTotal">0</span>
              </th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div id="tabs-3" style="display: none">
        <table id="tblResponsePermissions" class="tablesorter">
          <thead>
            <tr valign="top">
              <th class="sorter-false" nowrap="nowrap">
                <select id="ddlResponseRequestID"></select>
              </th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
            </tr>
            <tr valign="top">
              <th class="sorter-false" nowrap="nowrap">Request Number</th>
              <th class="sorter-false" nowrap="nowrap">Response ID</th>
              <th class="sorter-false" nowrap="nowrap">Status</th>
              <th class="sorter-false" nowrap="nowrap">
                Request Action Offices(s)
              </th>
              <th class="sorter-false" nowrap="nowrap">
                Response Action Office
              </th>
              <th class="sorter-false" nowrap="nowrap">
                Request Special Perms?
              </th>
              <th class="sorter-false" nowrap="nowrap">
                Response Special Perms?
              </th>
              <th class="sorter-false" nowrap="nowrap">Permissions</th>
            </tr>
          </thead>
          <tbody></tbody>
          <tfoot>
            <tr valign="top">
              <th nowrap="nowrap" colspan="8">
                Total: <span id="tblResponsePermsTotal">0</span>
              </th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div id="tabs-4" style="display: none">
        <table id="tblResponseFolderPermissions" class="tablesorter">
          <thead>
            <tr valign="top">
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap">
                <select id="ddlResponseFolderResponseID"></select>
              </th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
              <th class="sorter-false" nowrap="nowrap"></th>
            </tr>
            <tr valign="top">
              <th class="sorter-false" nowrap="nowrap">Request Number</th>
              <th class="sorter-false" nowrap="nowrap">Response ID</th>
              <th class="sorter-false" nowrap="nowrap">Folder Name</th>
              <th class="sorter-false" nowrap="nowrap">Response Status</th>
              <th class="sorter-false" nowrap="nowrap">
                Request Action Offices(s)
              </th>
              <th class="sorter-false" nowrap="nowrap">
                Response Action Office
              </th>
              <th class="sorter-false" nowrap="nowrap">
                Request Special Perms?
              </th>
              <th class="sorter-false" nowrap="nowrap">
                Response Special Perms?
              </th>
              <th class="sorter-false" nowrap="nowrap">
                Folder Special Perms?
              </th>
              <th class="sorter-false" nowrap="nowrap">Permissions</th>
            </tr>
          </thead>
          <tbody></tbody>
          <tfoot>
            <tr valign="top">
              <th nowrap="nowrap" colspan="10">
                Total: <span id="tblResponseFolderPermsTotal">0</span>
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
`;