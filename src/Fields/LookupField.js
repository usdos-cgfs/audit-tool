import { appContext } from "../infrastructure/ApplicationDbContext.js";
import { registerFieldComponent } from "../infrastructure/RegisterComponents.js";
import BaseField from "./BaseField.js";
import BaseFieldModule from "../components/Fields/BaseFieldModule.js";

const components = {
  view: "lookup-view",
  edit: "lookup-edit",
  new: "lookup-edit",
};

registerFieldComponent("lookup", components, BaseFieldModule);

const searchSelectComponents = {
  view: "search-select-view",
  edit: "search-select-edit",
  new: "search-select-edit",
};
registerFieldComponent("searchselect", searchSelectComponents);

export default class LookupField extends BaseField {
  constructor({
    displayName,
    type: entityType,
    isRequired = false,
    Visible,
    entitySet,
    options = ko.observableArray(),
    optionsFilter = null,
    optionsText = null,
    multiple = false,
    lookupCol = "Title",
  }) {
    super({ Visible, displayName, isRequired });
    this.entitySet = entitySet ?? appContext.Set(entityType);
    // Support passing in options
    // if options are not passed, assume this is a search input
    if (!options) {
      this.isSearch = true;
    } else {
      this.isSearch = false;
      this.allOpts = options;
    }
    this.isSearch = !options;
    this.multiple = multiple;
    this.Value = multiple ? ko.observableArray() : ko.observable();

    this.entityType = entityType;
    this.lookupCol = lookupCol;
    this.optionsText = optionsText ?? ((item) => item[this.lookupCol]);
    if (optionsFilter) this.optionsFilter = optionsFilter;
    this.components = this.multiple ? searchSelectComponents : components;
  }

  isSearch = false;

  allOpts;
  optionsFilter = (val) => val;

  Options = ko.pureComputed(() => {
    const optsFilter = ko.unwrap(this.optionsFilter);
    const allOpts = ko.unwrap(this.allOpts);
    return allOpts.filter(optsFilter);
  });

  IsLoading = ko.observable(false);
  HasLoaded = ko.observable(false);

  // TODO: Started this, should really go in the entity base class if we're doing active record
  // create = async () => {
  //   const newItems = this.multiple ? this.Value() : [this.Value()]
  //   newItems.map(item => this.entitySet.AddEntity(newItems))
  // }

  refresh = async () => {
    if (!this.Value()) {
      return;
    }
    this.IsLoading(true);
    if (!this.multiple) {
      await this.entitySet.LoadEntity(this.Value());
      this.IsLoading(false);
      this.HasLoaded(true);
      return;
    }

    await Promise.all(
      this.Value().map(
        async (entity) => await this.entitySet.LoadEntity(entity)
      )
    );
    this.IsLoading(false);
    this.HasLoaded(true);
  };

  ensure = async () => {
    if (this.HasLoaded()) return;
    if (this.IsLoading()) {
      return new Promise((resolve, reject) => {
        const isLoadingSubscription = this.IsLoading.subscribe((isLoading) => {
          if (!isLoading) {
            isLoadingSubscription.dispose();
            resolve();
          }
        });
      });
    }
    await this.refresh();
  };

  toString = ko.pureComputed(() => {
    if (!!!this.Value()) {
      return "";
    }
    if (this.multiple) {
      return this.Value()
        .map((val) => getEntityPropertyAsString(val, this.lookupCol))
        .join(", ");
    }
    return getEntityPropertyAsString(this.Value(), this.lookupCol);
  });

  get = () => {
    if (!this.Value()) return;
    if (this.multiple) {
      return this.Value().map((entity) => {
        return {
          ID: entity.ID,
          LookupValue: entity.LookupValue,
          Title: entity.Title,
        };
      });
    }
    const entity = this.Value();
    return {
      ID: entity.ID,
      LookupValue: entity.LookupValue,
      Title: entity.Title,
    };
  };

  set = async (val) => {
    if (!val) {
      this.Value(val);
      return;
    }
    if (this.multiple) {
      const valArr = Array.isArray(val) ? val : val.results ?? val.split("#;");
      // const values = await Promise.all(
      //   valArr.map(async (value) => await this.findOrCreateNewEntity(value))
      // );
      const values = valArr.map((value) => this.findOrCreateNewEntity(value));

      this.Value(values);
      // this.ensure();
    } else {
      const resolvedEntity = this.findOrCreateNewEntity(val);
      this.Value(resolvedEntity);
    }

    if (val && !this.toString()) {
      // this.ensure();
    }
  };

  findOrCreateNewEntity = (val) => {
    if (this.entityType.FindInStore) {
      const foundEntity = this.entityType.FindInStore(val);
      if (foundEntity) return foundEntity;
      console.warn(
        `Could not find entity in store: ${this.entityType.name}`,
        val
      );
    }

    const optionEntity = this.allOpts().find((entity) => entity.ID == val.ID);
    if (optionEntity) return optionEntity;

    // const cachedEntity = this.entitySet.FindInStore(val.ID);
    // if (cachedEntity) return cachedEntity;

    const newEntity = new this.entityType();
    newEntity.ID = val.ID;
    // Kick off the load process in the background
    this.entitySet.LoadEntity(newEntity);

    return newEntity;
  };

  // Text input event fired by search-select web component
  onSearchInput = (searchVal) => {
    console.log(searchVal);
  };

  components = components;
}

// Should fully constrain all entities, this is ridiculous
function getEntityPropertyAsString(entity, column) {
  if (entity.FieldMap && entity.FieldMap[column]) {
    const field = entity.FieldMap[column];
    if (typeof field == "function") {
      return field();
    }

    if (field.toString && typeof field.toString == "function") {
      return field.toString();
    }

    if (field.get && typeof field.get == "function") {
      return field.get();
    }

    if (field.obs) {
      return field.obs();
    }

    return field;
  }
  return entity[column] ?? "";
}
