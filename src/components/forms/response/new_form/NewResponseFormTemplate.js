import { html } from "../../../../sal/infrastructure/index.js";

export const newResponseFormTemplate = html`
  <div class="audit-form bg-dark new-request-form">
    <div class="form-fields" data-bind="foreach: FormFields">
      <!-- ko if: $parent.fieldIsEditable($data) -->
      <div
        class="form-field-component"
        data-bind="component: {
              name: components.edit, params: $data}, 
              class: classList"
      ></div>
      <!-- /ko -->
      <!-- ko ifnot: $parent.fieldIsEditable($data) -->
      <div
        class="form-field-component"
        data-bind="component: {
                name: components.view, params: $data}, 
                class: classList"
      ></div>
      <!-- /ko -->
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-warn" data-bind="click: clearForm">
        Clear Form
      </button>
      <button
        type="button"
        class="btn btn-success"
        data-bind="click: clickSubmit"
      >
        Create Response
      </button>
    </div>
  </div>
`;
