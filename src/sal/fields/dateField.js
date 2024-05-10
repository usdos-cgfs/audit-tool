import { registerFieldComponent } from "../infrastructure/index.js";
import { BaseField } from "./index.js";
import { BaseFieldModule } from "../components/fields/index.js";

export const dateFieldTypes = {
  date: "date",
  datetime: "datetime-local",
};

const components = {
  view: "date-view",
  edit: "date-edit",
  new: "date-edit",
};

registerFieldComponent({
  name: "date",
  components,
  viewModel: BaseFieldModule,
});

/**
 * This field needs to convert between locale and UTC Dates stored on the server;
 */

export class DateField extends BaseField {
  constructor(params) {
    super(params);
    this.type = params.type ?? dateFieldTypes.date;
  }

  toString = ko.pureComputed(() => {
    // if this is datetime vs date we expect different things
    switch (this.type) {
      case dateFieldTypes.date:
        return this.toLocaleDateString();
      case dateFieldTypes.datetime:
        return this.toLocaleString();
      default:
        return "";
    }
  });

  toSortableDateString = () => this.Value()?.format("yyyy-MM-dd");
  toLocaleDateString = () => this.Value()?.toLocaleDateString();
  toLocaleString = () => this.Value()?.toLocaleString();

  toInputDateString = () => {
    const d = this.Value();
    return [
      d.getUTCFullYear().toString().padStart(4, "0"),
      (d.getUTCMonth() + 1).toString().padStart(2, "0"),
      d.getUTCDate().toString().padStart(2, "0"),
    ].join("-");
  };
  toInputDateTimeString = () => this.Value().format("yyyy-MM-ddThh:mm");

  get = ko.pureComputed(() => {
    if (!this.Value() || isNaN(this.Value().valueOf())) {
      return null;
    }

    return this.Value().toISOString();
  });

  set = (newDate) => {
    if (!newDate) return null;
    if (newDate.constructor.getName() != "Date") {
      // console.warn("Attempting to set date", newDate);
      newDate = new Date(newDate);
    }
    if (newDate.getTimezoneOffset()) {
    }
    this.Value(newDate);
  };

  inputBinding = ko.pureComputed({
    read: () => {
      if (!this.Value()) return null;
      switch (this.type) {
        case dateFieldTypes.date:
          return this.toInputDateString();
        case dateFieldTypes.datetime:
          return this.toInputDateTimeString();
        default:
          return null;
      }
    },
    write: (val) => {
      if (!val) return;
      //writes in format
      const d = new Date(val);
      if (this.type == dateFieldTypes.datetime) {
        this.Value(d);
        return;
      }
      d.setHours(0);

      if (d.getTimezoneOffset() > 0) {
        d.setDate(d.getDate() + 1);
      }
      this.Value(d);
    },
  });

  components = components;
}