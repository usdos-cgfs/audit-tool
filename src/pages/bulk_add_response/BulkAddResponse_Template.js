﻿const html = String.raw;

export const bulkAddResponseTemplate = html`
  <div class="audit">
    <div id="divLoading" style="color: green">Loading...</div>
    <div id="divLoadSettings" style="display: none">
      <fieldset>
        <legend>
          Add Responses to Request Number:
          <span id="divRequestNumber" style="font-weight: bold"></span>
        </legend>
        <div style="padding-top: 10px">
          <a href="javascript:void" id="btnUploadResponses"
            ><span class="ui-icon ui-icon-gear"></span>Upload Responses to be
            Created</a
          >
        </div>
        <div style="padding-top: 10px">
          <a href="javascript:void" id="btnLoadResponses" style="display: none"
            >Click Here to Display Uploaded Responses</a
          >
        </div>
      </fieldset>
    </div>
    <div id="divLoadBulkResponsesOutput" style="padding-top: 15px"></div>
    <div style="padding-top: 15px">
      <a
        href="javascript:void"
        id="btnCreateResponses"
        style="display: none"
        title="Click here to Create the Responses"
        ><span class="ui-icon ui-icon-disk"></span>Create Responses</a
      >
      <div style="padding-top: 15px">
        <input
          id="btnCancel"
          type="button"
          class="ms-ButtonHeightWidth"
          value="Close"
          title="Close"
          onclick="SP.UI.ModalDialog.commonModalDialogClose(SP.UI.DialogResult.cancel)"
        />
      </div>
    </div>
  </div>
`;
