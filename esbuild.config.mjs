import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

let buildOpts = {
  sourcemap: true,
  minify: false,
  outdir: "dist",
};
let minify = false;
console.log(process.argv);
if (process.argv.includes("-p")) {
  // If we're in production, don't publish source maps
  console.log("Production Build");
  buildOpts.sourcemap = false;
  buildOpts.minify = true;
}

await esbuild.build({
  entryPoints: [
    "./src/audit_styles.css",
    "./src/pages/ao_db/ao_db.js",
    "./src/pages/ia_db/ia_db.js",
    "./src/pages/permissions/permissions.js",
    "./src/pages/qa_db/qa_db.js",
    "./src/pages/report_request_status/report_request_status.js",
    "./src/pages/response_docs_returned_today/response_docs_returned_today.js",
    "./src/pages/response_docs_submitted_today/response_docs_submitted_today.js",
    "./src/pages/ro_db/ro_db.js",
    "./src/pages/sp_db/sp_db.js",
    "./src/pages/update_site_groups/update_site_groups.js",
  ],
  bundle: true,
  ...buildOpts,
});

const referenceFiles = [
  "pages/ao_db/AO_DB.txt",
  "pages/ao_db/AO_DB_References.txt",
  "pages/ia_db/IA_DB.txt",
  "pages/ia_db/IA_DB_References.txt",
  "pages/home/Home.txt",
  "pages/home/Home_References.txt",
  "pages/permissions/Permissions.txt",
  "pages/permissions/Permissions_References.txt",
  "pages/qa_db/QA_DB.txt",
  "pages/qa_db/QA_DB_References.txt",
  "pages/report_request_status/Report_RequestStatus_References.txt",
  "pages/response_docs_returned_today/ResponseDocsReturnedToday_References.txt",
  "pages/response_docs_submitted_today/ResponseDocsSubmittedToday_References.txt",
  "pages/ro_db/RO_DB.txt",
  "pages/ro_db/RO_DB_References.txt",
  "pages/sp_db/SP_DB.txt",
  "pages/sp_db/SP_DB_References.txt",
  "pages/update_site_groups/UpdateSiteGroups.txt",
  "pages/update_site_groups/UpdateSiteGroups_References.txt",
];

referenceFiles.forEach(copyReferenceFiles);
function copyReferenceFiles(filePath) {
  const srcTextFile = path.resolve("src/" + filePath);
  const destTextFile = path.resolve(buildOpts.outdir + "/" + filePath);
  fs.copyFileSync(srcTextFile, destTextFile);
}
