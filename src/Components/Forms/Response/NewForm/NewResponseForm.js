import { BaseForm } from "../../BaseForm.js";
import { addResponse } from "../../../../services/AuditResponseService.js";
import { AuditResponse } from "../../../../entities/AuditResponse.js";
import { registerComponent } from "../../../../infrastructure/RegisterComponents.js";

const componentName = "custome-new-response-form";

export class NewResponseForm extends BaseForm {
  constructor({ entity }) {
    super({ entity, view: AuditResponse.Views.NewForm });
  }

  async clickSubmit() {
    this.saving(true);
    await this.submit();
    this.saving(false);
  }

  async submit() {
    const errors = this.validate();
    if (errors.length) return;

    const response = ko.unwrap(this.entity);

    try {
      await addResponse(response.ReqNum.Value(), response);
      this.onComplete(SP.UI.DialogResult.OK);
    } catch (e) {
      alert(e);
    }
  }

  clearForm() {}

  fieldIsEditable(field) {
    const entity = ko.unwrap(this.entity);

    const nonEditableFields = [entity.ReqNum];

    return !nonEditableFields.includes(field);
  }

  componentName = componentName;
}

registerComponent({
  name: componentName,
  folder: "Forms/Response/NewForm",
  template: "NewResponseFormTemplate",
});