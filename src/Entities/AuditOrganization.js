export class AuditOrganization {
  constructor() {}

  static Views = {
    All: [
      "ID",
      "Title",
      "Country",
      "Organization_x0020_Description",
      "EmailGroup",
      "Org_Type",
      "Post_x0020_Code",
      "UserGroup",
    ],
  };

  static ListDef = {
    name: "AuditOrganizations",
    title: "AuditOrganizations",
  };
}
