## Analysis

1. Schema Differences
2. GUI Differences
3. Code Differences
4. Notification Differences

### Schema Differences

Request

- RequestingOffice (Lookup)

ResponseDocsRO

- RequestingOffice (String)
- Permissions

### GUI Differences

New Request

- Requesting Office

On Request Submitted FY is appended to request title
Sensitivity defaults to Official?

Status of Response Document is not directly editable
Option to approve response docs exists as long as response is in Submitted Status

Requests Report

- Column for Requesting Office

### Code Differences

Need to add RequestingOffice when querying Request list

- m_fnResetAllDBPerms
- m_fnResetPageDBPerms

RequestingOffice

- m_fnCreateROEmailLogItem
- m_fnCreateROFolder
- m_fnCheckResponseDocsRoPerms

## Updates

1. Replace Status Tables with components
2. Add RequestingOffice to list, update queries
3. Add RequestingOffice to RO list, update updates
4. Update Page Permissions function
5. Implement RO Permissions Functions
