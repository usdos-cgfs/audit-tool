import { BaseForm } from "../index.js";
import { registerComponent } from "../../../infrastructure/register_components.js";

const componentName = "default-constrained-entity-form";

/**
 * Combines functionality for View, Edit, Disp in one component.
 */
export class DefaultForm extends BaseForm {
  constructor({ entity, view, displayMode }) {
    super({ entity, view });
    // this.entityView = new ConstrainedEntityView({ entity, view });
    this.displayMode(displayMode);
  }

  displayMode = ko.observable();

  clickSubmit() {}

  clickCancel() {}

  clickClear() {}

  params = this;
  componentName = componentName;
}

const template = `
  <div class="audit-form bg-dark">
    <div class="form-fields vertical" data-bind="foreach: FormFields">
      <div
        class="form-field-component"
        data-bind="component: {
            name: components[$parent.displayMode()], params: $data}, 
            class: width"
      ></div>
    </div>
  </div>
`;

ko.components.register(componentName, {
  template,
});

console.log("template", template);
