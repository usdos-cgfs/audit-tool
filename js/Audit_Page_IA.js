﻿var Audit = window.Audit || {};
Audit.IAReport = Audit.IAReport || {};

$(document).ready(function () {
    SP.SOD.executeFunc('sp.js', 'SP.ClientContext', ExecuteOrDelayUntilScriptLoaded(InitReport, "sp.js"));

})

function InitReport() 
{    

	/*********NOTE: the Contribute permission level needs to have manage permissions turned on ************/

	Audit.IAReport.Report = new Audit.IAReport.NewReportPage();
	Audit.IAReport.Init();
}

Audit.IAReport.Init = function()
{
	function SetTimer()
	{
		var intervalRefreshID = setInterval(function() {
		    var divVal = $("#divCounter").text();
		    var count = divVal * 1 - 1;
		    $("#divCounter").text(count);
			if (count <= 0) 
			{
				if( !Audit.IAReport.Report.IsTransactionExecuting() )
					Audit.IAReport.Report.Refresh();
				else
				{
					clearInterval( intervalRefreshID );
					$("#divCounter").text("1200");
					SetTimer();
				}
		    }
		}, 1000);
	}
	
	SetTimer();
}

Audit.IAReport.NewReportPage = function ()
{			
	var m_libCoverSheetLibraryGUID = null; //set below
	var m_libRequestDocsLibraryGUID = null; //set below
	var m_libResponseDocsLibraryGUID = null; //set below

	var m_bigMap = new Object();
	var m_arrRequests = new Array();
	var m_arrRequestsToClose = new Array();
	var m_arrResponseDocsCheckedOut = new Array();
	var m_arrPermissionsResponseFolders = new Array();
	
	var m_itemID = null;
	var m_requestNum = null;
	var m_responseTitle = null;
	var m_responseStatus = null;
		
	var m_bIsTransactionExecuting = false;	
	var m_statusId = null;
	
	var m_bIsSiteOwner = true;
	var m_sGoToResponseTitle = null;
		
	var m_oRequestTitleAndDocCount = new Object();
	var m_oResponseTitleAndDocCount = new Object();
	
	LoadInfo();
		
	function LoadInfo()
	{		
		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web();
		
		var requestList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleRequests() );
		var requestQuery = new SP.CamlQuery();	
		requestQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="Title"/></OrderBy></Query></View>');
		m_requestItems = requestList.getItems( requestQuery );
		//need to check permissions because of displaying special perms and granting special perms
		//currCtx.load( m_requestItems, 'Include(ID, Title, ReqSubject, ReqStatus, IsSample, ReqDueDate, InternalDueDate, ActionOffice, EmailActionOffice, Reviewer, Owner, ReceiptDate, MemoDate, RelatedAudit, ActionItems, Comments, EmailSent, ClosedDate, ClosedBy, Modified, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');
		currCtx.load( m_requestItems, 'Include(ID, Title, ReqSubject, ReqStatus, IsSample, ReqDueDate, InternalDueDate, ActionOffice, EmailActionOffice, Reviewer, Owner, ReceiptDate, MemoDate, RelatedAudit, ActionItems, Comments, EmailSent, ClosedDate, ClosedBy, Modified)');
		
		var responseList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleResponses() );
		var responseQuery = new SP.CamlQuery();	
		responseQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ReqNum"/></OrderBy></Query></View>');
		m_responseItems = responseList.getItems( responseQuery );
		//need to check permissions because of granting/removing special perms
		//currCtx.load( m_responseItems, 'Include(ID, Title, ReqNum, ActionOffice, ReturnReason, SampleNumber, ResStatus, Comments, Modified, ClosedDate, ClosedBy, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))' );
		currCtx.load( m_responseItems, 'Include(ID, Title, ReqNum, ActionOffice, ReturnReason, SampleNumber, ResStatus, Comments, Modified, ClosedDate, ClosedBy, POC, POCCC)' );

		//make sure to only pull documents (fsobjtype = 0)
		var responseDocsLib = web.get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocs() );
		var responseDocsQuery = new SP.CamlQuery();	
		responseDocsQuery.set_viewXml('<View Scope="RecursiveAll"><Query><OrderBy><FieldRef Name="ReqNum"/><FieldRef Name="ResID"/></OrderBy><Where><Eq><FieldRef Name="ContentType"/><Value Type="Text">Document</Value></Eq></Where></Query></View>');
		m_ResponseDocsItems = responseDocsLib.getItems( responseDocsQuery );
		currCtx.load( m_ResponseDocsItems, 'Include(ID, Title, ReqNum, ResID, DocumentStatus, RejectReason, ReceiptDate, FileLeafRef, FileDirRef, File_x0020_Size, CheckoutUser, Modified, Editor)');
		
		m_groupColl = web.get_siteGroups();
		currCtx.load( m_groupColl );

		var aoList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleActionOffices() );
		var aoQuery = new SP.CamlQuery();	
		aoQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="Title"/></OrderBy></Query></View>');
		m_aoItems = aoList.getItems( aoQuery );
		currCtx.load( m_aoItems, 'Include(ID, Title, UserGroup)');
		
		var ob = new SP.BasePermissions();
		ob.set(SP.PermissionKind.deleteListItems); //site owners and members should have this
		m_userPermissionAccess = web.doesUserHavePermissions(ob);

		currCtx.executeQueryAsync(OnSuccess, OnFailure);	
		function OnSuccess(sender, args)
		{						
			m_bIsSiteOwner = m_userPermissionAccess.get_value();
			//alert( m_bIsSiteOwner );
			
			if( m_bIsSiteOwner )
			{
				var currCtx = new SP.ClientContext.get_current();
				var web = currCtx.get_web();
				
				//make sure to only pull documents (fsobjtype = 0)
				var pagesLib = web.get_lists().getByTitle( "Pages" );
				var pagesQuery = new SP.CamlQuery();	
				pagesQuery.set_viewXml('<View Scope="RecursiveAll"><Query><OrderBy><FieldRef Name="Title"/></OrderBy><Where><Eq><FieldRef Name="FileLeafRef"/><Value Type="Text">AO_DB.aspx</Value></Eq></Where></Query></View>');
				m_PageItems = pagesLib.getItems( pagesQuery);
				currCtx.load( m_PageItems, 'Include(ID, Title, FileLeafRef, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');
				
				
				var emailList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleEmailHistory() );
				var emailListQuery = new SP.CamlQuery();	
				emailListQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID"/></OrderBy><Where><And><Eq><FieldRef Name="Title"/><Value Type="Text">EANotifications</Value></Eq><Eq><FieldRef Name="FSObjType"/><Value Type="Text">1</Value></Eq></And></Where></Query></View>');
				emailListFolderItemsEA = emailList.getItems( emailListQuery );
				currCtx.load( emailListFolderItemsEA, 'Include(ID, Title, DisplayName)');

				
				function OnSuccessLoadPages(sender, args)
				{				
					$("#divIA").show();
					//if they can iterate the pages and the permissions on the pages, we'll consider them a site owner
					m_fnLoadData( );	
					m_fnResetAODBPerms( m_PageItems );
					
					m_fnCheckForEAEmailFolder( emailListFolderItemsEA );
				}
				function OnFailureLoadPages(sender, args)
				{
					$("#divIA").show();
					m_fnLoadData();	
				}
				currCtx.executeQueryAsync(OnSuccessLoadPages, OnFailureLoadPages);
			}
			else
			{
				$("#divIA").show();
				m_bIsSiteOwner = false;
				m_fnLoadData();	
			}

			setTimeout( function(){ m_fnLoadRemainder();}, 100 );
		}		
		function OnFailure(sender, args)
		{
			$("#divLoading").hide();
			statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace());
   			SP.UI.Status.setStatusPriColor(statusId, 'red');
   			m_bIsSiteOwner = false;
		}
	}	
	
	function m_fnRefresh( requestNumber )
	{
		var curPath = location.pathname;
	
		if( !requestNumber )
		{	
			var tabIndex = $("#tabs").tabs('option', 'active');
			curPath += "?Tab=" + tabIndex;
	
			if( tabIndex == 1 )
			{				
				var responseName = $("#ddlResponseName").val();
				if( responseName != null && responseName!= "" )
					curPath += "&ResNum=" + responseName;
			}
			else if( tabIndex == 2 )
			{
				var requestNum = $("#ddlReqNum").val();
				if( requestNum != null && requestNum != "" )
					curPath += "&ReqNum=" + requestNum;
			}
			location.href = curPath;
		}
		else
		{
			var curPath = location.pathname;
			
			var tabIndex = $("#tabs").tabs('option', 'active');
			curPath += "?Tab=" + tabIndex;
	
			if( requestNumber != null && requestNumber != "")
				curPath += "&ReqNum=" + requestNumber ;
			
			location.href = curPath;
		}
	}
	
	function m_fnLoadData()
	{
		Audit.Common.Utilities.LoadSiteGroups( m_groupColl );
		Audit.Common.Utilities.LoadActionOffices( m_aoItems );

		LoadRequests();
		LoadResponses();
		LoadResponseDocs();
		LoadResponseCounts();
		DisplayCheckedOutFiles ( m_arrResponseDocsCheckedOut );
		
		UpdateDDs( m_arrRequests );
		
		DisplayRequestsThatShouldClose();
					
		LoadTabStatusReport1( m_arrRequests, "fbody1");
		LoadTabStatusReport2( m_arrRequests, "fbody2");

/*
		//console.time( 'LoadDDOptionsTbl' );
		LoadDDOptionsTbl();
		//console.timeEnd( 'LoadDDOptionsTbl' );
		BindHandlersOnLoad();		

		OnLoadDisplayTabAndRequest();		
		Audit.Common.Utilities.OnLoadDisplayTimeStamp();*/
	}
	
	function m_fnLoadRemainder()
	{		
		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web();
		
		m_coversheetDocsLibrary = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleCoverSheets() );
		currCtx.load( m_coversheetDocsLibrary, 'Title', 'Id');

		m_requestDocsLibrary = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleRequestDocs() );
		currCtx.load( m_requestDocsLibrary , 'Title', 'Id');

		m_responseDocsLibrary = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocs() );
		currCtx.load( m_responseDocsLibrary , 'Title', 'Id');

		function OnSuccess(sender, args)
		{				
			LoadLibGUIDS();
		}		
		function OnFailure(sender, args)
		{
			statusId = SP.UI.Status.addStatus("Failed loading: "  + args.get_message() + "\n" + args.get_stackTrace());
   			SP.UI.Status.setStatusPriColor(statusId, 'red');
		}
		currCtx.executeQueryAsync(OnSuccess, OnFailure);	
	}

	//always check ao permissions and reset them
	function m_fnResetAODBPerms( pageItems )
	{
		var listItemEnumerator = pageItems.getEnumerator();
		while(listItemEnumerator.moveNext())
		{
			var oListItem = listItemEnumerator.get_current();
				    
			var bReset = false;
			
			if( !oListItem.get_hasUniqueRoleAssignments() )
				bReset = true;

			var arrAOs = Audit.Common.Utilities.GetActionOffices();	
			
			if( !bReset ) // check to see if all action offices have access to the AO_DB.aspx page
			{
				if( arrAOs != null )
				{		
					for( var x = 0; x < arrAOs.length; x++ )
					{					
						var bFound = false;
						
						var actionOfficeGroup = arrAOs[x].userGroup;
						if( actionOfficeGroup != null && actionOfficeGroup != "" )
						{
							var roleAssignments = oListItem.get_roleAssignments();
							var rolesEnumerator = roleAssignments.getEnumerator();
							while(rolesEnumerator.moveNext())
							{
								var role = rolesEnumerator.get_current();
								var roleMember = role.get_member();
								var memeberLoginName = roleMember.get_loginName();
								var memberTitleName = roleMember.get_title();
							
								if( memberTitleName == actionOfficeGroup )
									bFound = true;
							}	
							
							if( !bFound )
							{
								bReset = true;
								break;
							}	
						}
					}
				}
			}

			if( bReset ) //if at least one doesnt have access, reset the permissions on that page
			{	    			
				var currCtx = new SP.ClientContext.get_current();
				var web = currCtx.get_web(); 
				
				this.currentUser = web.get_currentUser();
		    	this.ownerGroup = web.get_associatedOwnerGroup();
			 	this.memberGroup = web.get_associatedMemberGroup();
			 	this.visitorGroup = web.get_associatedVisitorGroup();

				oListItem.resetRoleInheritance();
				oListItem.breakRoleInheritance( false, false );
	
				var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
				roleDefBindingCollContribute.add( web.get_roleDefinitions().getByType( SP.RoleType.contributor) );
		
			    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
				roleDefBindingCollRestrictedRead.add( web.get_roleDefinitions().getByName( "Restricted Read" ) );
		
				//add site associated groups
				oListItem.get_roleAssignments().add( ownerGroup, roleDefBindingCollContribute );
				oListItem.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
				oListItem.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
				
				oListItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();
				
				//Need to break up adding AOs because it exceeds the resource limit (request uses too many resources)
				function onUpdatAOPageSucceeded() 
				{
					//add action offices			
					if( arrAOs != null && arrAOs.length > 0 )
					{
						for( var x = 0; x < arrAOs.length; x++ )
						{											
							var actionOfficeGroupName = arrAOs[x].userGroup;
							var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
		
							if( actionOfficeGroup != null && actionOfficeGroup != "" )
							{
								var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
								roleDefBindingCollRestrictedRead.add( web.get_roleDefinitions().getByName("Restricted Read") );
				
								oListItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );	
								
								function onUpdatAOPageSucceeded2() 
								{
									
								}
								function onUpdatAOPageFailed2(sender, args) 
								{		
									//statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace());
								}
			    				currCtx.executeQueryAsync(Function.createDelegate(data, onUpdatAOPageSucceeded2), Function.createDelegate(data, onUpdatAOPageFailed2));

							}
						}			
					}				
				}
				
				function onUpdatAOPageFailed(sender, args) 
				{		
					statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace());
				}
		
				var data = {item: oListItem};			
			    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdatAOPageSucceeded), Function.createDelegate(data, onUpdatAOPageFailed));
			}
			break;
		}
	}
	
	//always check
	function m_fnCheckForEAEmailFolder( emailListFolderItemsEA )
	{
		var bFound = false;
		var listItemEnumerator = emailListFolderItemsEA.getEnumerator();
		while(listItemEnumerator.moveNext())
		{
			var oListItem = listItemEnumerator.get_current();
			bFound = true;
			break;
		}
		
		if( !bFound )
		{
			
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();
	
			var emailList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleEmailHistory() );

			var itemCreateInfo = new SP.ListItemCreationInformation();
			itemCreateInfo.set_underlyingObjectType( SP.FileSystemObjectType.folder );
			itemCreateInfo.set_leafName( "EANotifications" );
			oNewEmailFolder = emailList.addItem( itemCreateInfo );								
			oNewEmailFolder.set_item("Title", "EANotifications" );
			oNewEmailFolder.update();	
	
			this.currentUser = web.get_currentUser();
	    	this.ownerGroup = web.get_associatedOwnerGroup();
		 	this.memberGroup = web.get_associatedMemberGroup();
		 	this.visitorGroup = web.get_associatedVisitorGroup();

			oNewEmailFolder.resetRoleInheritance();
			oNewEmailFolder.breakRoleInheritance(false, false);
			
			var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollAdmin.add( web.get_roleDefinitions().getByType( SP.RoleType.administrator) );
	
			var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollContribute.add( web.get_roleDefinitions().getByType( SP.RoleType.contributor) );
	
		    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollRestrictedRead.add( web.get_roleDefinitions().getByName( "Restricted Read" ));
	
		    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollRestrictedContribute.add( web.get_roleDefinitions().getByName( "Restricted Contribute" ));

			//add associated site groups
			oNewEmailFolder.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin);
			oNewEmailFolder.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
			oNewEmailFolder.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
																		
			var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );
			if( spGroupQA != null )					
				oNewEmailFolder.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedContribute);

			oNewEmailFolder.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();
		
			//Need to break up adding AOs because it exceeds the resource limit (request uses too many resources)
			function onUpdatePermsSucceeded() 
			{
				//alert("done");
			}
		
			function onUpdatePermsFailed(sender, args) 
			{		
				statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace());
			}
	
			var data = {};			
		    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdatePermsSucceeded), Function.createDelegate(data, onUpdatePermsFailed));
		}
	}
	
	
	//QA doesnt have edit permissions rights on the response/response folder
	//Therefore, when IA gets alerted that the response has been updated by QA, check if response status is updated
	//and then update the permissions
	function m_fnCheckIfResponsePermissionsNeedUpdating ( requestStatus, title, OnCompletedChecking )
	{ 		
		for( var x = 0; x < m_arrRequests.length; x++ )
		{
			var oRequest = m_arrRequests[x];
			for( var y = 0; y < oRequest.responses.length; y++ )
			{
				if( oRequest.responses[y].title == title )
				{
					var doneBreakingResponse = false;
					m_fnBreakResponseAndFolderPermissions( requestStatus, oRequest.responses[y], false, true, false, false, function(doneBreakingResponse )
					{
						OnCompletedChecking ( true );
					});
				}
			}
		}
	}
	
	function OnLoadDisplayTabAndRequest()
	{		
		var paramTabIndex = GetUrlKeyValue("Tab");
		if( paramTabIndex != null && paramTabIndex != "" )
		{
			$("#tabs").tabs("option", "active", paramTabIndex);
		}
		
		var bFilteredResponse = false;
		if( paramTabIndex == 1 )
		{
			var paramResponseNum = GetUrlKeyValue("ResNum");
			if( paramResponseNum != null && paramResponseNum != "" )
			{
				$("#ddlResponseName").val( paramResponseNum ).change();
				bFilteredResponse = true;
			}
			
		}
		else
		{
			var paramRequestNum = GetUrlKeyValue("ReqNum");
			if( paramRequestNum != null && paramRequestNum != "" )
			{
				$("#ddlReqNum").val( paramRequestNum ).change(); //this is on the 3rd tab
			}
		}	
		
		if( !bFilteredResponse )
		{
			$(".sr2-response-item").show();
			OnLoadFilterOnOpenResponses();
		}

		OnLoadFilterOnOpenRequests();
	}
	
	function OnLoadFilterOnOpenRequests()
	{
		var count = 0;
		var cntOpen = 0;
		var cntReOpened = 0;
		
		var eacher = $(".sr1-request-item");
		
		eacher.each(function() 
		{							
			var reqStatus =  $.trim( $(this).find(".sr1-request-status").text() );
			
			if( reqStatus == "Open" || reqStatus == "ReOpened" )
			{
				count++;
				
				if( reqStatus == "Open")
					cntOpen ++;
				else if( reqStatus == "ReOpened")
					cntReOpened ++;
			}
		});

		if( count > 0)
		{			
			/*if( cntOpen > 0 && cntReOpened == 0 )
				$("#ddlRequestStatus").val( "Open" ).change().focus();*/
			if( cntOpen > 0 )
				$("#ddlRequestStatus").val( "Open" ).change().focus(); //in the filter, it's been changed so that when open is searched, it searches reopened too
			else if( cntReOpened > 0 && cntOpen == 0 )
				$("#ddlRequestStatus").val( "ReOpened" ).change().focus();			
		}
	}

	function OnLoadFilterOnOpenResponses()
	{
		var count = 0;
		
		var eacher = $(".sr2-response-item");
		
		eacher.each(function() 
		{							
			var resStatus =  $.trim( $(this).find(".sr2-response-status").text() );
			
			if( resStatus == "1-Open")
			{
				count++;
			
				return false; //break the loop
			}
		});

		if( count > 0)
		{			
			$("#ddlResponseStatus").val( "1-Open" ).change().focus();
		}
	}

	function LoadRequests()
	{
		m_bigMap = new Object();
		m_arrRequests = new Array();
				
		try
		{
			var listItemEnumerator = m_requestItems.getEnumerator();
			while(listItemEnumerator.moveNext())
			{
				var oListItem = listItemEnumerator.get_current();
				
				var id = oListItem.get_item('ID');
				var number = oListItem.get_item('Title');
				var status = oListItem.get_item('ReqStatus');
	
				var subject = oListItem.get_item('ReqSubject');
				if( subject == null )
					subject = "";
					
				var sample = oListItem.get_item('IsSample');
	
				var dueDate = oListItem.get_item('ReqDueDate');
				var internalDueDate = oListItem.get_item('InternalDueDate');
				var receiptDate = oListItem.get_item('ReceiptDate');
				var memoDate = oListItem.get_item('MemoDate');
				var closedDate = oListItem.get_item('ClosedDate');
	
				dueDate != null ? dueDate = dueDate.format("MM/dd/yyyy") : dueDate = "";
				internalDueDate != null ? internalDueDate = internalDueDate.format("MM/dd/yyyy") : internalDueDate = "";
				receiptDate != null ? receiptDate = receiptDate.format("MM/dd/yyyy") : receiptDate= "";
				memoDate != null ? memoDate = memoDate.format("MM/dd/yyyy") : memoDate= "";
				closedDate != null ? closedDate = closedDate.format("MM/dd/yyyy") : closedDate = "";
	
				var arrActionOffice = oListItem.get_item('ActionOffice');
				var actionOffice = "";
				if ( arrActionOffice.length > 0 )
				{
					actionOffice = "<div style='cursor:pointer; white-space:nowrap' title='Click to view' ><span class='actionOfficeContainer'><span class='ui-icon ui-icon-search'></span><a href='javascript:void(0)'>View Action Offices</a></span>";
					
					var arrAOs = new Array();
					for( var x = 0; x < arrActionOffice.length; x++ )
					{
						arrAOs.push( arrActionOffice[x].get_lookupValue() );
					}					
					arrAOs = arrAOs.sort();
						
					for( var x = 0; x < arrAOs.length; x++ )
					{
						actionOffice += "<div class='sr1-request-actionOffice-item collapsed'>" + arrAOs[x] + "</div>";
					}
					actionOffice += "</div>";
				}
	
				var arrActionOffice = oListItem.get_item('EmailActionOffice');
				var emailActionOffice = "";
				if ( arrActionOffice.length > 0 )
				{
					emailActionOffice = "<div style='cursor:pointer' title='Click to view' ><span class='actionOfficeContainer'><span class='ui-icon ui-icon-search'></span><a href='javascript:void(0)'>View Email Action Offices</a></span>";
				
					var arrAOs = new Array();
					for( var x = 0; x < arrActionOffice.length; x++ )
					{
						arrAOs.push( arrActionOffice[x].get_lookupValue() );
					}					
					arrAOs = arrAOs.sort();

					for( var x = 0; x < arrAOs.length; x++ )
					{
						emailActionOffice += "<div class='sr1-request-actionOffice-item collapsed'>" + arrAOs[x] + "</div>";
					}
					emailActionOffice += "</div>";
				}
						
				var comments = oListItem.get_item('Comments');
				var emailSent = oListItem.get_item('EmailSent');
				var reviewer = oListItem.get_item('Reviewer');
				var owner = oListItem.get_item('Owner');
				var relatedAudit = oListItem.get_item('RelatedAudit');
				var actionItems = oListItem.get_item('ActionItems');
			
				if( comments == null )
					comments = "";
				if( reviewer == null )
					reviewer = "";
				if( owner == null )
					owner = "";
				if( relatedAudit == null )
					relatedAudit = "";	
				if( actionItems == null )
					actionItems = "";	
			
				var closedBy = Audit.Common.Utilities.GetFriendlyDisplayName( oListItem, "ClosedBy");
	
	
				var requestObject = new Object();
				requestObject ["ID"] = id;
				requestObject ["number"] = number;
				requestObject ["subject"] = subject;
				requestObject ["dueDate"] = dueDate;
				requestObject ["status"] = status;
				requestObject ["internalDueDate"] = internalDueDate;
				requestObject ["sample"] = sample;
				requestObject ["requestDocs"] = new Array();
				requestObject ["coversheets"] = new Array();
				requestObject ["responses"] = new Array();
				requestObject ["responsesOpenCnt"] = 0;
				requestObject ["actionOffice"] = actionOffice;
				requestObject ["emailActionOffice"] = emailActionOffice;
				requestObject ["comments"] = comments;
				requestObject ["emailSent"] = emailSent;
				requestObject ["closedDate"] = closedDate;											
				requestObject ["closedBy"] = closedBy;
				requestObject ["reviewer"] = reviewer;
				requestObject ["owner"] = owner;
				requestObject ["receiptDate"] = receiptDate;
				requestObject ["memoDate"] = memoDate;
				requestObject ["relatedAudit"] = relatedAudit;
				requestObject ["actionItems"] = actionItems;
				requestObject ["item"] = oListItem;			
				
				m_arrRequests.push( requestObject );
				
				m_bigMap["request-" + number] = requestObject;
			}
		}catch( err )
		{
			alert( err );
		}
	}
	
	function LoadLibGUIDS()
	{				
		m_libResponseDocsLibraryGUID = m_responseDocsLibrary.get_id();
		m_libCoverSheetLibraryGUID = m_coversheetDocsLibrary.get_id();
		m_libRequestDocsLibraryGUID = m_requestDocsLibrary.get_id();
	}	
		
	function LoadRequestDocs( oRequest )
	{
		try
		{
			oRequest.requestDocs = new Array();
			 
			var listItemEnumerator = m_RequestDocItems.getEnumerator();
			while(listItemEnumerator.moveNext())
			{
				var oListItem = listItemEnumerator.get_current();
				
				var number = oListItem.get_item('ReqNum');
				if( number != null )
				{
					number = number.get_lookupValue();
					if( number == oRequest.number )
					{
						var requestDocObject = new Object();
						requestDocObject["ID"] = oListItem.get_item('ID');
						requestDocObject["fileName"] = oListItem.get_item('FileLeafRef');
						requestDocObject["folder"] = oListItem.get_item('FileDirRef');
						
						oRequest.requestDocs.push( requestDocObject);
					}
				}
			}
		}
		catch( err )
		{
			alert( err );
		}
	}

	function LoadCoverSheets( oRequest )
	{				
		try
		{
			oRequest.coversheets = new Array();
			
			var listItemEnumerator = m_CoverSheetItems.getEnumerator();
			while(listItemEnumerator.moveNext())
			{
				var oListItem = listItemEnumerator.get_current();
				
				var number = oListItem.get_item('ReqNum');
				if( number != null )
				{
					number = number.get_lookupValue();
					if( number == oRequest.number ) //just double checking here
					{
						var coversheetObject = new Object();
						coversheetObject ["ID"] = oListItem.get_item('ID');
						
						var arrActionOffice = oListItem.get_item('ActionOffice');
						var actionOffice = "";
						if ( arrActionOffice.length > 0 )
						{
							actionOffice = "<div style='cursor:pointer' title='Click to view' ><span class='ui-icon ui-icon-search'></span><span class='actionOfficeContainerRequestInfo'><a href='javascript:void(0)'>View Action Offices</a></span>";
							
							for( var y = 0; y < arrActionOffice.length; y++ )
							{
								actionOffice += "<div class='sr1-request-actionOfficeContainerRequestInfo-item collapsed'>" + arrActionOffice[y].get_lookupValue() + "</div>";
							}
							actionOffice += "</div>";
						}
						coversheetObject ["actionOffice"] = actionOffice;
	
						coversheetObject ["title"] = oListItem.get_item('FileLeafRef');
						coversheetObject ["folder"] = oListItem.get_item('FileDirRef');
						coversheetObject ["item"] = oListItem;
						
						oRequest.coversheets.push( coversheetObject );
					}
				}
			}
		}
		catch( err )
		{
			alert( err );
		}
	}
	
	function LoadResponses()
	{		
		try
		{		
			var listItemEnumerator = m_responseItems.getEnumerator();
			while(listItemEnumerator.moveNext())
			{
				var oListItem = listItemEnumerator.get_current();
				
				var number = oListItem.get_item('ReqNum');
				if( number != null )
				{
					number = number.get_lookupValue();
								
					if( number == null ) //this will happen if the request was deleted but the responses weren't
						continue;

					var oRequestBigMap = m_bigMap["request-" + number];

					var returnReason = oListItem.get_item('ReturnReason');
					if( returnReason == null ) returnReason = "";
					
					var responseObject = new Object();
					responseObject ["ID"] = oListItem.get_item('ID');
					responseObject ["number"] = number;
					var title = oListItem.get_item('Title');
					responseObject ["title"] = title;
					
					//if( title == "PBC-229-CGFS_C-6" )
					//	debugger; 
						
					responseObject ["item"] = oListItem;
					
					var comments = oListItem.get_item('Comments');
					
					try
					{
						comments = $(comments).html();
						if( comments == null || comments == "" )
							responseObject ["comments"] = "";
						else
						{								
							comments = comments.replace(/[^a-z0-9\s]/gi, ' ');
							responseObject ["comments"] = comments;	
						}
					}
					catch( commentsErr )
					{
						if( comments == null || comments == "" )
							responseObject ["comments"] = "";
						comments = comments.replace(/[^a-z0-9\s]/gi, ' ');
							responseObject ["comments"] = comments;	
					}
						
					var modified = oListItem.get_item('Modified').format("MM/dd/yyyy hh:mm tt");
					responseObject ["modified"] = modified;						

					var closedDate = oListItem.get_item('ClosedDate');
					closedDate != null ? closedDate = closedDate.format("MM/dd/yyyy") : closedDate = "";
					responseObject ["closedDate"] = closedDate;						
							
					responseObject ["closedBy"] = Audit.Common.Utilities.GetFriendlyDisplayName( oListItem, "ClosedBy");

					responseObject ["sample"] = oListItem.get_item('SampleNumber');
					if( responseObject ["sample"] == null )
						responseObject ["sample"] = "";
					
					responseObject ["actionOffice"] = oListItem.get_item('ActionOffice');						
					if( responseObject ["actionOffice"] == null )
						responseObject ["actionOffice"] = "";
					else
						responseObject ["actionOffice"] = responseObject ["actionOffice"].get_lookupValue();

					responseObject ["poc"] = oListItem.get_item('POC');						
					if( responseObject ["poc"] == null )
						responseObject ["poc"] = "";
					else
						responseObject ["poc"] = responseObject ["poc"].get_lookupValue();

					responseObject ["pocCC"] = oListItem.get_item('POCCC');						
					if( responseObject ["pocCC"] == null )
						responseObject ["pocCC"] = "";
					else
						responseObject ["pocCC"] = responseObject ["pocCC"].get_lookupValue();
						
					responseObject ["returnReason"] = returnReason;
					responseObject ["resStatus"] = oListItem.get_item('ResStatus');
					
					if( responseObject ["resStatus"] != "7-Closed")
						oRequestBigMap.responsesOpenCnt = oRequestBigMap.responsesOpenCnt + 1;//	m_arrRequests[x].responsesOpenCnt = m_arrRequests[x].responsesOpenCnt + 1;
						
					responseObject ["responseDocs"] = new Array();
					responseObject ["responseFolderItem"] = null;
					
					//m_arrRequests[x]["responses"].push( responseObject );
					oRequestBigMap.responses.push( responseObject );
					m_bigMap["response-" + title] = responseObject;
		
				}
			}
		}
		catch( err )
		{
			alert( err );
		}
	}
	
	
	function LoadResponseDocs()
	{				
		m_arrResponseDocsCheckedOut = new Array();
		
		try
		{		
			var listItemEnumerator = m_ResponseDocsItems.getEnumerator();
			while(listItemEnumerator.moveNext())
			{
				var oListItem = listItemEnumerator.get_current();
			
				responseDocID = oListItem.get_item('ID');
				
				var requestNumber = oListItem.get_item('ReqNum');
				if( requestNumber != null )
					requestNumber = requestNumber.get_lookupValue();
					
				var responseID = oListItem.get_item('ResID');
				if( responseID != null )
					responseID = responseID.get_lookupValue();				
					
				if( requestNumber == null || responseID == null )
					continue;
				
				var oRequest = m_bigMap["request-" + requestNumber];
				if( oRequest )
				{			
					for( var y = 0; y < oRequest.responses.length; y++ )
					{
						if( oRequest.responses[y]["title"] == responseID )
						{
							var responseDocObject = new Object();
							responseDocObject ["ID"] = oListItem.get_item('ID');
							responseDocObject ["fileName"] = oListItem.get_item('FileLeafRef');
							responseDocObject ["title"] = oListItem.get_item('Title');
							if( responseDocObject ["title"] == null )
								responseDocObject ["title"] = "";
							responseDocObject ["folder"] = oListItem.get_item('FileDirRef');
							responseDocObject ["documentStatus"] = oListItem.get_item('DocumentStatus');	 
							responseDocObject ["rejectReason"] = oListItem.get_item('RejectReason');	 
							if( responseDocObject ["rejectReason"] == null )
								responseDocObject ["rejectReason"] = "";
							else
								responseDocObject ["rejectReason"] = responseDocObject ["rejectReason"].replace(/(\r\n|\n|\r)/gm, "<br/>");
							
							var fileSize = oListItem.get_item('File_x0020_Size');
							fileSize = Audit.Common.Utilities.GetFriendlyFileSize( fileSize );												
							responseDocObject ["fileSize"] = fileSize;
							
							var receiptDate = "";
							if( oListItem.get_item('ReceiptDate') != null && oListItem.get_item('ReceiptDate') != "")
								receiptDate = oListItem.get_item('ReceiptDate').format("MM/dd/yyyy");
							responseDocObject ["receiptDate"] = receiptDate;						
							
							var modifiedDate = "";
							if( oListItem.get_item('Modified') != null && oListItem.get_item('Modified') != "")
								modifiedDate = oListItem.get_item('Modified').format("MM/dd/yyyy hh:mm tt");
							responseDocObject ["modifiedDate"] = modifiedDate;						
							
							responseDocObject ["modifiedBy"] = Audit.Common.Utilities.GetFriendlyDisplayName( oListItem, "Editor");
							responseDocObject ["checkedOutBy"] = Audit.Common.Utilities.GetFriendlyDisplayName( oListItem, "CheckoutUser");							
							
							if( responseDocObject ["checkedOutBy"] != "")
							{
								responseDocObject["response"] = oRequest.responses[y];
								responseDocObject["request"] = oRequest;
								m_arrResponseDocsCheckedOut.push( responseDocObject  );
							}
							
							oRequest.responses[y]["responseDocs"].push( responseDocObject );
						}
					}
				}
			} 
		}
		catch( err )
		{
			alert( err );
		}
	}
	
	function LoadResponseCounts()
	{
		m_oRequestTitleAndDocCount = new Object();
		m_oResponseTitleAndDocCount = new Object();
		
		var requestLength = m_arrRequests.length;
		for( var x = 0; x < requestLength; x++ )
		{
			var oRequest = m_arrRequests[x];
			if( oRequest.responses.length > 0  )
			{
				var responseLength = oRequest.responses.length;
				for( var y = 0; y < responseLength; y ++ )
				{
					var responseCount = oRequest.responses[y].responseDocs.length;
					m_oResponseTitleAndDocCount[ oRequest.responses[y].title ] = responseCount;
					
					var curCount = m_oRequestTitleAndDocCount[ oRequest.number ];
					if( curCount == null )
						m_oRequestTitleAndDocCount[ oRequest.number ] = responseCount;
					else
						m_oRequestTitleAndDocCount[ oRequest.number ] += responseCount;
				}
			}
		}
	}
	
	function LoadResponseDocFolders()
	{
		m_arrPermissionsResponseFolders = new Array();
		
		try
		{
			var cntToBreak = 0;
			var cntBroken = 0;
			
			if( m_ResponseDocsFoldersItems != null )
			{
				var listItemEnumerator = m_ResponseDocsFoldersItems.getEnumerator();
				while(listItemEnumerator.moveNext())
				{
					var oListItem = listItemEnumerator.get_current();
					
					var itemName = oListItem.get_displayName();
					var itemId = oListItem.get_id();
					var itemUrl = oListItem.get_item('EncodedAbsUrl');
										
					//Set the title if for whatever reason the folder didnt have it's title set					
					if( oListItem.get_item("Title") == null )
					{
						var currCtx = new SP.ClientContext.get_current();
						var web = currCtx.get_web();
						
						oListItem.set_item("Title", itemName );
						oListItem.update();
						
						function OnSuccessUpdateTitle(sender, args)
						{		
						}		
						function OnFailureUpdateTitle(sender, args)
						{
						}
						currCtx.executeQueryAsync(OnSuccessUpdateTitle, OnFailureUpdateTitle);
					}
					
					var objFold = new Object();
					objFold["ID"] = itemId;
					objFold["ItemName"] = itemName;
					objFold["Item"] = oListItem;
					objFold["UserPermissions"] = new Array();
					objFold["GroupPermissions"] = new Array();
					
					if( m_bIsSiteOwner )
					{
						var roleAssignments = oListItem.get_roleAssignments();
						var rolesEnumerator = roleAssignments.getEnumerator();
						while(rolesEnumerator.moveNext())
						{
							var role = rolesEnumerator.get_current();
							var roleMember = role.get_member();
							var memeberLoginName = roleMember.get_loginName();
							var memberTitleName = roleMember.get_title();
							
							var permissionType = "UserPermissions";
							var principalType = roleMember.get_principalType();
							if (principalType == SP.Utilities.PrincipalType.securityGroup || principalType == SP.Utilities.PrincipalType.sharePointGroup)
							{
								permissionType = "GroupPermissions";
							}
		
							var roleDefs = role.get_roleDefinitionBindings();
								
							var roleDefsEnumerator = roleDefs.getEnumerator();
							while(roleDefsEnumerator.moveNext())
							{
								var rd = roleDefsEnumerator.get_current();
								var rdName = rd.get_name();
								
								objFold[ permissionType ].push(rdName + " - " + memberTitleName);
							}
						}
					}			
					
					m_arrPermissionsResponseFolders.push(objFold);
					
					for( var x = 0; x < m_arrRequests.length; x++ )
					{
						var oRequest = m_arrRequests[x];
						for( var y = 0; y < oRequest.responses.length; y++ )
						{
							if( oRequest.responses[y].title == itemName )
							{
								oRequest.responses[y].responseFolderItem = oListItem;
								m_bigMap["response-" + itemName].responseFolderItem = oListItem;
								break;
							}
						} 
					}
				}	
			}
		}
		catch( err )
		{
			
		}
	}
	
	function UpdateDDs( arr )
	{	
		var arrRequests = new Array();
		var arrLength = arr.length;
		//for( var x = 0; x < arr.length; x++ )
		while ( arrLength-- ) 
		{
			var oRequest = arr[ arrLength ];
			arrRequests.push( oRequest.number );			
		}

		Audit.Common.Utilities.AddOptions( arrRequests, "#ddlReqNum", false );
	}
		
	function LoadRequestInfo( requestNum )
	{
		ClearRequestInfo();
	
		if( requestNum == "" )
			return;
			
		var oRequest = null;
		oRequest = m_bigMap["request-" + requestNum];
		
		if( oRequest == null )
			return;

		$("#divRequestInfo").show();
		$("#divRequestDocs").show();
		$("#divCoverSheets").show();
		$("#divResponses").show();
		$("#divResponseDocs").show();
		
		LoadTabRequestInfoRequestInfo( oRequest );
	}
	
	function ClearRequestInfo()
	{
		$("#requestInfoNum").text( "" );
		$("#requestInfoSub").text( "" );
		$("#requestInfoInternalDueDate").text( "" );
		$("#requestInfoDueDate").text( "" );
		$("#requestInfoStatus").text( "" );
		$("#requestInfoSample").text( "" );
		$("#requestInfoReviewer").text( "" );
		$("#requestInfoOwner").text( "" );
		$("#requestInfoReceiptDate").text( "" );
		$("#requestInfoMemoDate").text( "" );
		$("#requestInfoRelatedAudit").text( "" );
		$("#requestInfoActionItems").html( "" );
		$("#requestInfoComments").html( "" );
		$("#requestInfoActionOffice").text( "" );
		$("#requestInfoEmailActionOffice").text( "" );
		$("#requestEmailSent").text( "" );
		$("#requestInfoSpecialPermissions").text( "" );
		$("#divResponsesGrantSpecialPermissions").html( "" );		
		$("#divResponsesRemoveSpecialPermissions").html( "" );
		
		$("#divRequestInfo").hide();
		$("#divRequestDocs").hide();
		$("#divCoverSheets").hide();
		$("#divResponses").hide();
		$("#divResponseDocs").hide();

		$("#tblRequestDocs").hide();
		$("#tblCoverSheets").hide();
		$("#tblResponses").hide();
		$("#tblResponseDocs").hide();
		$("#divEmptyRequestDocsMsg").hide();
		$("#divEmptyCoversheetsMsg").hide();
		
		$("#tblCoverSheetsTotal").text( "0" );
		$("#tblResponsesTotal").text( "0" );
		$("#tblResponseDocsTotal").text( "0" );
		
		$("#tblRequestDocs tbody").empty();
		$("#tblCoverSheets tbody").empty();
		$("#tblResponses tbody").empty();
		$("#tblResponseDocs tbody").empty();
		
		$("#divEmptyResponseDocsMsg").hide();
		$("#divRequestDocsLoading").show();
		$("#divCoversheetsLoading").show();
		$("#divResponsesLoading").show();
		$("#divResponseDocsLoading").show();
		$("#divResponsesShowHideFolderPerms").hide();

		$("#divRequestClose").hide();
		
	}

	function LoadTabRequestInfoRequestInfo( oRequest )
	{
		try
		{
			$("#requestInfoNum").text( oRequest.number );
			$("#requestInfoSub").text( oRequest.subject );
			$("#requestInfoInternalDueDate").text( oRequest.internalDueDate );
			$("#requestInfoDueDate").text( oRequest.dueDate );
			
			if( oRequest.status == "Closed" )
			{
				$("#requestInfoStatus").html( "<span style='color:red'>" + oRequest.status + " on " + oRequest.closedDate + "</span>");	
			}
			else if( oRequest.status == "Canceled" )
			{
				$("#requestInfoStatus").html( "<span style='color:red'>" + oRequest.status + "</span>");	
			}
			else
				$("#requestInfoStatus").html( "<span style='color:green'>" + oRequest.status + "</span>");	
	
			var sample = Audit.Common.Utilities.GetTrueFalseIcon( oRequest.sample ) + " No";
			if( oRequest.sample )
				sample = Audit.Common.Utilities.GetTrueFalseIcon( oRequest.sample ) + "Yes";
				
			$("#requestInfoSample").html( sample );		
			$("#requestInfoReviewer").text( oRequest.reviewer );
			$("#requestInfoOwner").text( oRequest.owner );
			$("#requestInfoReceiptDate").text( oRequest.receiptDate );
			$("#requestInfoMemoDate").text( oRequest.memoDate );
			$("#requestInfoRelatedAudit").text( oRequest.relatedAudit );
			$("#requestInfoActionItems").html( oRequest.actionItems );
			
			//do this to make sure handlers work
			var ao = oRequest.actionOffice;
			ao = ao.replace(/actionOfficeContainer/gi, "actionOfficeContainerRequestInfo");
			ao = ao.replace(/sr1-request-actionOffice-item/gi, "sr1-request-actionOfficeContainerRequestInfo-item");		
			$("#requestInfoActionOffice").html( ao );
			
			//do this to make sure handlers work
			var ao = oRequest.emailActionOffice;
			ao = ao.replace(/actionOfficeContainer/gi, "actionOfficeContainerRequestInfo");
			ao = ao.replace(/sr1-request-actionOffice-item/gi, "sr1-request-actionOfficeContainerRequestInfo-item");
			$("#requestInfoEmailActionOffice").html( ao );
			$("#requestInfoComments").html( oRequest.comments );

			//Display close request button if it should be closed
			$("#divRequestClose").hide();
			if( m_arrRequestsToClose && m_arrRequestsToClose.length > 0 )
			{
				for( var x = 0; x < m_arrRequestsToClose.length; x ++ )
				{
					var oIt = m_arrRequestsToClose[x];
					if( oIt.requestNumber == oRequest.number )
					{
						$("#divRequestClose").show();
						$("#btnCloseRequest").click(function(){
							m_fnCloseRequest();
						});
						break;
					}
				}	
			}

			///Requery to now get the request from the list, but this time with the permission attributes
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();
			
			var requestList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleRequests() );
			var requestQuery = new SP.CamlQuery();	
			requestQuery.set_viewXml('<View><Query><Where><Eq><FieldRef Name="ID"/><Value Type="Text">' + oRequest.ID + '</Value></Eq></Where></Query></View>');
			m_aRequestItem = requestList.getItems( requestQuery );
			if( m_bIsSiteOwner )
			{
				$(".response-permissions").hide(); //resets this in case it was toggled to show 
				currCtx.load( m_aRequestItem, 'Include(ID, Title, ReqSubject, ReqStatus, IsSample, ReqDueDate, InternalDueDate, ActionOffice, EmailActionOffice, Reviewer, Owner, ReceiptDate, MemoDate, RelatedAudit, ActionItems, Comments, EmailSent, ClosedDate, ClosedBy, Modified, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');
			}
			else
				currCtx.load( m_aRequestItem, 'Include(ID, Title, ReqSubject, ReqStatus, IsSample, ReqDueDate, InternalDueDate, ActionOffice, EmailActionOffice, Reviewer, Owner, ReceiptDate, MemoDate, RelatedAudit, ActionItems, Comments, EmailSent, ClosedDate, ClosedBy, Modified)');
				
			var requestDocLib = web.get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleRequestDocs() );
			var requestDocQuery = new SP.CamlQuery();	
			requestDocQuery.set_viewXml('<View Scope="RecursiveAll"><Query><Where><Eq><FieldRef Name="ReqNum"/><Value Type="Text">' + oRequest.number + '</Value></Eq></Where></Query></View>');
			m_RequestDocItems = requestDocLib.getItems( requestDocQuery );
			currCtx.load( m_RequestDocItems, 'Include(ID, Title, ReqNum, FileLeafRef, FileDirRef)');
	
			var coverSheetLib = web.get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleCoverSheets() );
			var coverSheetQuery = new SP.CamlQuery();	
			coverSheetQuery.set_viewXml('<View Scope="RecursiveAll"><Query><Where><Eq><FieldRef Name="ReqNum"/><Value Type="Text">' + oRequest.number + '</Value></Eq></Where></Query></View>');
			m_CoverSheetItems = coverSheetLib.getItems( coverSheetQuery );
			if( m_bIsSiteOwner )
				currCtx.load( m_CoverSheetItems, 'Include(ID, Title, ReqNum, ActionOffice, FileLeafRef, FileDirRef, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');
			else
				currCtx.load( m_CoverSheetItems, 'Include(ID, Title, ReqNum, ActionOffice, FileLeafRef, FileDirRef)');
			
			function OnSuccess(sender, args)
			{				
				//Update the item field on the request
				var listItemEnumerator = m_aRequestItem.getEnumerator();
				while(listItemEnumerator.moveNext())
				{
					var oListItem = listItemEnumerator.get_current();
					oRequest.item = oListItem;
					break;
				}
				
				if( m_bIsSiteOwner )
				{
					if( !oRequest.item.get_hasUniqueRoleAssignments() )
					{
						m_fnBreakRequestPermissions( oRequest.item, false );
					}
				}
				
				LoadRequestDocs( oRequest );
				LoadCoverSheets( oRequest );

				var match1 = false;
				var match2 = false;
				
				if( m_bIsSiteOwner )
				{
					var permissionsToCheck = SP.PermissionKind.viewListItems;
					match1 = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oRequest.item,  Audit.Common.Utilities.GetGroupNameSpecialPerm1(), permissionsToCheck );
					match2 = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oRequest.item,  Audit.Common.Utilities.GetGroupNameSpecialPerm2(), permissionsToCheck );
					
					if( match1 && match2 )
					{
						var specialPerms = '<span class="ui-icon ui-icon-check"></span> Yes';
						$("#requestInfoSpecialPermissions").html( specialPerms );
					}
					else
					{
						var specialPerms = '<span class="ui-icon ui-icon-close"></span> No';
						$("#requestInfoSpecialPermissions").html( specialPerms );
					}
				}
				
				if( oRequest.emailSent )
				{
					$("#requestInfoEmailSent").html( "<span class='ui-icon ui-icon-check'></span> Yes");
					$("#divSendEmailAction").html( "<span class='ui-icon ui-icon-mail-closed'></span><a title='Send Email to Action Offices' href='javascript:void(0)' onclick='Audit.IAReport.Report.SendEmail(" + oRequest.ID + ")'>Re-Send Email to Action Offices</a>");
				}
				else
				{
					$("#requestInfoEmailSent").html( "<span class='ui-icon ui-icon-close'></span> No");
					$("#divSendEmailAction").html( "<span class='ui-icon ui-icon-mail-closed'></span><a title='Send Email to Action Offices' href='javascript:void(0)' onclick='Audit.IAReport.Report.SendEmail(" + oRequest.ID + ")'>Send Email to Action Offices</a>");
				}
				
				$("#divEmailHistory").html( "<a title='View Email History' href='javascript:void(0)' onclick='Audit.IAReport.Report.ViewEmailHistoryFolder(\"" + oRequest.number  + "\")'><span class='ui-icon ui-icon-search'></span>View Email History</a>" );
		
				
				if( oRequest.status != "Open" && oRequest.status != "ReOpened")
				{
					$("#divSendEmailAction").html( "" ); //dont allow send email if the request status is not open
				}
				
				var requestLink = "<div><a title='View Request' href='javascript:void(0)' onclick='Audit.IAReport.Report.ViewRequest(" + oRequest.ID + ")'><span class='ui-icon ui-icon-search'>View Request</span>View Request</a></div>";
				var requestEditLink = "<div><a title='Edit Request' href='javascript:void(0)' onclick='Audit.IAReport.Report.EditRequest(\"" + oRequest.ID + "\",\"" + oRequest.number + "\")'><span class='ui-icon ui-icon-pencil'>Edit Request</span>Edit Request</a></div>";
				$("#divRequestInfoActions").html("<fieldset style='width:200px;margin-left:10px; padding-left:10px;'><legend>Request Actions</legend>" + requestLink + requestEditLink + "</fielset>");
		
				$("#divResponsesGrantSpecialPermissions").html( '<a title="Grant Special Permissions" href="javascript:void(0)" onclick="Audit.IAReport.Report.GrantSpecialPermissions(\'' + oRequest.number + '\')"><span class="ui-icon ui-icon-unlocked"></span>Grant Special Permissions</a>' );		
				$("#divResponsesRemoveSpecialPermissions").html( '<a title="Remove Special Permissions" href="javascript:void(0)" onclick="Audit.IAReport.Report.RemoveSpecialPermissions(\'' + oRequest.number + '\')"><span class="ui-icon ui-icon-locked"></span>Remove Special Permissions</a>' );		
				
				
				LoadTabRequestInfoRequestDocs( oRequest );
				LoadTabRequestInfoCoverSheets( oRequest );
				LoadTabRequestInfoResponses( oRequest );
			}
			function OnFailure(sender, args)
			{
			}
			currCtx.executeQueryAsync(OnSuccess, OnFailure);
		}
		catch( err )
		{
			alert( err );
		}
	}
	

	function LoadTabRequestInfoRequestDocs( oRequest )
	{		
		$("#divRequestDocsLoading").hide();
		
		var sRequestDocs = "";
		for( var y = 0; y < oRequest.requestDocs.length; y++ )
		{
			var oRequestDoc = oRequest.requestDocs[y];

			var requestDocLink = "<a title='View Request Document Properties' href='javascript:void(0)' onclick='Audit.IAReport.Report.ViewRequestDoc(" + oRequestDoc.ID + ")'><span class='ui-icon ui-icon-search'>View Request Doc</span></a>";
			var requestDocEditLink = "<a title='Edit Request Document Properties' href='javascript:void(0)' onclick='Audit.IAReport.Report.EditRequestDoc(" + oRequestDoc.ID + ")'><span class='ui-icon ui-icon-pencil'>Edit Request Doc</span></a>";
			
			if( oRequest.status == "Closed" || oRequest.status == "Canceled")
				requestDocEditLink = "";
			
			var link = "<a href='../_layouts/download.aspx?SourceUrl=" + oRequestDoc.folder + "/" + oRequestDoc.fileName + "'>" + oRequestDoc.fileName + "</a>";
			sRequestDocs += '<tr class="request-doc-item">' + 
				'<td class="request-doc-title" title="Click to Download">' + link + '</td>' +
				'<td class="request-doc-action">' + requestDocLink + requestDocEditLink + '</td>' +
			'</tr>';
		}
		$("#tblRequestDocs tbody").append( sRequestDocs );
		
		if( oRequest.requestDocs.length > 0 )
		{
			$("#tblRequestDocsTotal").text( oRequest.requestDocs.length );
			$("#tblRequestDocs").show();	
			$("#divEmptyRequestDocsMsg").hide();
		}
		else
		{
			$("#divEmptyRequestDocsMsg").show();
		}
		
		if( oRequest.status == "Closed" || oRequest.status == "Canceled")
			$("#divRequestDocActions").html( "" );		
		else
			$("#divRequestDocActions").html( '<a title="Upload Request Document" href="javascript:void(0)" onclick="Audit.IAReport.Report.UploadRequestDoc(\'' + oRequest.number + '\')"><span class="ui-icon ui-icon-circle-arrow-n">Upload Request Document</span>Upload Request Doc</a>' );		
	}
	
	
	function LoadTabRequestInfoCoverSheets( oRequest )
	{		
		$("#divCoversheetsLoading").hide();

		var sCoverSheets = "";
		for( var y = 0; y < oRequest.coversheets.length; y++ )
		{
			var oCoversheet = oRequest.coversheets[y];
			var actionOffice = oCoversheet.actionOffice;
			var coversheetLink = "<a title='View Coversheet' href='javascript:void(0)' onclick='Audit.IAReport.Report.ViewCoverSheet(" + oCoversheet.ID + ")'><span class='ui-icon ui-icon-search'>View Coversheet</span></a>";
			var coversheetEditLink = "<a title='Edit Coversheet' href='javascript:void(0)' onclick='Audit.IAReport.Report.EditCoverSheet(\"" + oCoversheet.ID + "\",\"" + oRequest.number  + "\")'><span class='ui-icon ui-icon-pencil'>Edit Coversheet</span></a>";

			if( oRequest.status == "Closed" || oRequest.status == "Canceled")
				coversheetEditLink = "";
			
			var link = "<a href='../_layouts/download.aspx?SourceUrl=" + oCoversheet.folder + "/" + oCoversheet.title + "'>" + oCoversheet.title + "</a>";
			sCoverSheets += '<tr class="coversheet-item">' + 
				'<td class="coversheet-title" title="Click to Download">' + link + '</td>' +
				'<td class="coversheet-title">' + actionOffice + '</td>' +
				'<td class="coversheet-action">' + coversheetLink + coversheetEditLink + '</td>' +
			'</tr>';
		}
		$("#tblCoverSheets tbody").append( sCoverSheets );
		
		if( oRequest.coversheets.length > 0 )
		{
			$("#tblCoverSheetsTotal").text( oRequest.coversheets.length );
			$("#tblCoverSheets").show();	
			$("#divEmptyCoversheetsMsg").hide();
		}
		else
		{
			$("#divEmptyCoversheetsMsg").show();
		}
		
		if( oRequest.status == "Closed" || oRequest.status == "Canceled")
			$("#divCoverSheetActions").html( "" );		
		else
			$("#divCoverSheetActions").html( '<a title="Upload Cover Sheet or Supplemental Document" href="javascript:void(0)" onclick="Audit.IAReport.Report.UploadCoverSheet(\'' + oRequest.number + '\')"><span class="ui-icon ui-icon-circle-arrow-n"></span>Upload Cover Sheet or Supplemental Document</a>' );		

		BindActionOfficeRequestInfoHandler();
	}
	
	//when action office or qa updates the response and it comes back to IA, IA gets emailed a link with the response number; When they open the link in the browser, it will ]
	//take them to 2nd tab; When they click on the response (which is filtered), it will display tab 3 with the request details. At that point, it will try to check to see if the response permissions 
	//need to be updated
	function m_fnLoadResponseDocFolder( responseTitle, OnComplete )
	{
		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web();
		
		var responseList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleResponses() );
		var responseQuery = new SP.CamlQuery();	
		responseQuery.set_viewXml('<View><Query><Where><Eq><FieldRef Name="Title"/><Value Type="Text">' + responseTitle + '</Value></Eq></Where></Query></View>');
		m_aResponseItem = responseList.getItems( responseQuery );
		//need to check permissions because of granting/removing special perms
		currCtx.load( m_aResponseItem, 'Include(ID, Title, ReqNum, ActionOffice, ReturnReason, SampleNumber, ResStatus, Comments, Modified, ClosedDate, ClosedBy, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))' );

		var responseDocsLibFolderslist = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocs() );
		var responseDocsLibFolderslistQuery = new SP.CamlQuery();
		//include the dash
	    responseDocsLibFolderslistQuery.set_viewXml('<View><Query><Where><And><Eq><FieldRef Name="Title"/><Value Type="Text">' + responseTitle + '</Value></Eq><Eq><FieldRef Name="ContentType" /><Value Type="Text">Folder</Value></Eq></And></Where></Query></View>');
		m_ResponseDocsFoldersItems = responseDocsLibFolderslist.getItems(responseDocsLibFolderslistQuery);
		currCtx.load( m_ResponseDocsFoldersItems, "Include( DisplayName, Title, Id, EncodedAbsUrl, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))");
		
		function OnSuccess(sender, args)
		{	
			var oResponseItem = null;		
			//Requery the response item to now have the permissions on the responses; Avoid doing it at the top because it impacts load time
			var listItemEnumerator = m_aResponseItem.getEnumerator();
			while(listItemEnumerator.moveNext())
			{
				var oListItem = listItemEnumerator.get_current();
				
				for( var x = 0; x < m_arrRequests.length; x++ )
				{
					var oRequest = m_arrRequests[x];
					for( var y = 0; y < oRequest.responses.length; y++ )
					{
						if( oRequest.responses[y].title == responseTitle )
						{
							oRequest.responses[y].item = oListItem;
							break;
						}
					} 
				}
				
				break;
			}
			
			LoadResponseDocFolders( oResponseItem ); //really, this only runs through the one response and we're only doing this to set the response item's folder so that we can query the permissions on it
			
			OnComplete( true );
		}
		function OnFailure(sender, args)
		{
			OnComplete( false );
		}
		currCtx.executeQueryAsync(OnSuccess, OnFailure);
	}
	
	function LoadTabRequestInfoResponses( oRequest )
	{
		if( m_bIsSiteOwner )
		{
			/* for this specific response selected, check that the permissions don't need updating*/
			if( m_sGoToResponseTitle != null && m_sGoToResponseTitle != "" )
			{			
				m_fnLoadResponseDocFolder( m_sGoToResponseTitle, function( doneLoadingThisResponseFolder )
				{
					if( doneLoadingThisResponseFolder )
					{
						m_fnCheckIfResponsePermissionsNeedUpdating( oRequest.status, m_sGoToResponseTitle, function( doneCheckingResponseFolder )
						{
							if( doneCheckingResponseFolder )
							{
								LoadTabRequestInfoResponses2( oRequest);
							}
						});
					}
					else
						LoadTabRequestInfoResponses2( oRequest );
				});
			}
			else
				LoadTabRequestInfoResponses2( oRequest );
		}
		else
			LoadTabRequestInfoResponses2( oRequest );
	}
	
	function LoadTabRequestInfoResponses2( oRequest )
	{
		$("#divResponsesLoading").show();
		document.body.style.cursor = 'wait';
		m_notifyIDLoadingResponses = SP.UI.Notify.addNotification("Loading Responses...", true);
		
		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web();

		var responseList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleResponses() );
		var responseQuery = new SP.CamlQuery();	
		responseQuery.set_viewXml('<View><Query><Where><Eq><FieldRef Name="ReqNum"/><Value Type="Text">' + oRequest.number + '</Value></Eq></Where></Query></View>');
		m_subsetResponseItems = responseList.getItems( responseQuery );
		//need to check permissions because of granting/removing special perms
		if( m_bIsSiteOwner )
			currCtx.load( m_subsetResponseItems, 'Include(ID, Title, ReqNum, ActionOffice, ReturnReason, SampleNumber, ResStatus, Comments, Modified, ClosedDate, ClosedBy, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))' );
		else
			currCtx.load( m_subsetResponseItems, 'Include(ID, Title, ReqNum, ActionOffice, ReturnReason, SampleNumber, ResStatus, Comments, Modified, ClosedDate, ClosedBy)' );

		var responseDocsLibFolderslist = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocs() );
		var responseDocsLibFolderslistQuery = new SP.CamlQuery();
		//include the dash
	    responseDocsLibFolderslistQuery.set_viewXml('<View><Query><Where><And><BeginsWith><FieldRef Name="Title"/><Value Type="Text">' + oRequest.number + '-</Value></BeginsWith><Eq><FieldRef Name="ContentType" /><Value Type="Text">Folder</Value></Eq></And></Where></Query></View>');
		m_ResponseDocsFoldersItems = responseDocsLibFolderslist.getItems( responseDocsLibFolderslistQuery );
		if( m_bIsSiteOwner )
			currCtx.load( m_ResponseDocsFoldersItems, "Include( DisplayName, Title, Id, EncodedAbsUrl, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))");
		else
			currCtx.load( m_ResponseDocsFoldersItems, "Include( DisplayName, Title, Id, EncodedAbsUrl)");
		
		function OnSuccess(sender, args)
		{
			var listItemEnumerator = m_subsetResponseItems.getEnumerator();
			while(listItemEnumerator.moveNext())
			{
				var oListItem = listItemEnumerator.get_current();
				var responseTitle = oListItem.get_item("Title");
				
				if( m_bigMap["response-" + responseTitle] )
					m_bigMap["response-" + responseTitle].item = oListItem; //update the response item with an item that has the permission attributes

				if( m_bIsSiteOwner )
				{
					if( !oListItem.get_hasUniqueRoleAssignments() )
					{
						m_fnBreakResponsePermissions( oListItem, false, true);
					}
				}
			}

		
			LoadResponseDocFolders();
			
			var sResponses = "";		
			var responseCount = oRequest.responses.length;
			
			oRequest.responses.sort(function(a, b) {
				a = parseInt(a.sample, 10 );
				b = parseInt(b.sample, 10 );
				return a - b;
			});

			if( responseCount == 0 )
			{
				notifyId = SP.UI.Notify.addNotification(oRequest.number + " has 0 responses. Please create a Response", false);
				$("#divResponsesShowHideFolderPerms").hide();
			}
			
			for( var y = 0; y < responseCount; y++ )
			{
				var oResponse = oRequest.responses[y];
				
				var responseLink = "<a title='View Response' href='javascript:void(0)' onclick='Audit.IAReport.Report.ViewResponse(\"" + oRequest.number + "\",\"" + oResponse.ID + "\",\"" + oResponse.title  + "\",\"" + oResponse.resStatus + "\")'><span class='ui-icon ui-icon-search'>View Response</span></a>";
				var responseEditLink = "<a title='Edit Response' href='javascript:void(0)' onclick='Audit.IAReport.Report.EditResponse(\"" + oRequest.number + "\",\"" + oResponse.ID + "\",\"" + oResponse.title  + "\",\"" + oResponse.resStatus + "\")'><span class='ui-icon ui-icon-pencil'>Edit Response</span></a>";
				var responseFolderLink = "<a title='View Response Documents' href='javascript:void(0)' onclick='Audit.IAReport.Report.ViewResponseDocFolder(\"" + oResponse.title + "\")'><span class='ui-icon ui-icon-folder-collapsed'>View Folder</span></a>";
				var responseFolderAddLink = "<a title='Upload Response Documents' href='javascript:void(0)' onclick='Audit.IAReport.Report.UploadResponseDoc(\"" + oRequest.number + "\",\"" + oResponse.title  + "\")'><span class='ui-icon ui-icon-circle-arrow-n'>Upload Docs</span></a>";
				var responseReopenLink = "";
				
				if( oRequest.status == "Closed" || oRequest.status == "Canceled" )
				{
					responseEditLink = "";
					responseFolderLink = "";
					responseFolderAddLink = "";
				}
				if( oResponse.resStatus.indexOf("Closed") >= 0 )
				{
					responseEditLink = "";
					responseFolderLink = "";
					responseFolderAddLink = "";
					responseReopenLink = "<div style='padding-top:5px; padding-left:20px;'><span class='ui-icon ui-icon-gear'></span><a title='Click to Open Response' href='javascript:void(0)' onclick='Audit.IAReport.Report.ReOpenResponse(\"" + oRequest.number + "\",\"" + oResponse.title  + "\")'>Open Response?</a></div>";
				}
				if( oResponse.resStatus != "1-Open" && oResponse.resStatus != "2-Submitted" && oResponse.resStatus != "3-Returned to Action Office" && oResponse.resStatus != "5-Returned to GFS" )
				{
					responseFolderAddLink = "";
				}
								
				var arrRequestActionOffices = oRequest.item.get_item('ActionOffice');			
				var responseActionOfficeIsInRequest = false;
				if( arrRequestActionOffices != null )
				{
					for( var x = 0; x < arrRequestActionOffices.length; x++ )
					{
						if( arrRequestActionOffices[x].get_lookupValue() == oResponse.actionOffice)
						{
							responseActionOfficeIsInRequest = true;
						}
					}
				}
	
				var groupPerms = "";
				for( var x = 0; x < m_arrPermissionsResponseFolders.length; x++ )
				{
					if( m_arrPermissionsResponseFolders[x].ItemName == oResponse.title )
					{
						arrGroupPerms = m_arrPermissionsResponseFolders[x].GroupPermissions;
						
						var grouppermissionsArr = arrGroupPerms.sort();
						grouppermissionsArr.sort(function(a, b) {
	    					return a.toLowerCase().localeCompare(b.toLowerCase());
						});
						
						for( var z = 0; z < grouppermissionsArr.length; z++ )
						{
							groupPerms += "<div>" + grouppermissionsArr[z] + "</div>";	
						}
						break;
					}
				}			
				var specialPerms = "";
				if( groupPerms.indexOf( Audit.Common.Utilities.GetGroupNameSpecialPerm1() ) >= 0 && groupPerms.indexOf( Audit.Common.Utilities.GetGroupNameSpecialPerm2() ) >= 0 )
				{
					specialPerms = '<span class="ui-icon ui-icon-check"></span>';
				}
	
				var styleTag = "";
				if( !responseActionOfficeIsInRequest )
				{
					styleTag =' style="background-color:lightsalmon; font-style:italic; font-weight:bold; color:red !important;" title="This Action Office is not found in the Action Office list for the Request"';
				}				
				
				var resStatus = oResponse.resStatus;
				if( oResponse.resStatus == "7-Closed" )
				{
					resStatus = '<span style="color:red">' + resStatus + " on " + oResponse.closedDate + " by " + oResponse.closedBy + '</span>';
				}
				else
					resStatus = '<span style="color:green">' + resStatus + '</span>';
	
				//{{if poc}}<span style="color:green">*</span>{{/if}}
				
				var ao = oResponse.actionOffice;	
				if( oResponse.poc != null && oResponse.poc != "" )
				{
				 	ao = '<span title="This response has a POC">' + ao + ' <span style="color:green">POC: ' + oResponse.poc + '</span></span>';
				}
	
	
				var resID = "response-item-title-" + oResponse.title;
				sResponses += '<tr class="response-item">' + 
					'<td class="response-sample">' + oResponse.sample + '</td>' +
					'<td id="' + resID + '" class="response-title">' + oResponse.title + '</td>' +
					'<td class="response-actionOffice" ' + styleTag +'>' + ao + '</td>' +
					'<td class="response-resStatus">' + resStatus + responseReopenLink + '</td>' +
					'<td class="response-returnReason" style="white-space:pre-line">' + oResponse.returnReason + '</td>' +
					'<td class="response-specialPermissions ">' + specialPerms + '</td>' +
					'<td class="response-permissions ">' + groupPerms + '</td>' +
					'<td class="response-action">' + responseLink + responseEditLink + '</td>' +
					'<td class="response-responseDocs">' + responseFolderLink + responseFolderAddLink + '</td>' +
				'</tr>';			
			}
	
			$("#tblResponses tbody").append( sResponses );	
			$("#divResponsesLoading").hide();
			SP.UI.Notify.removeNotification( m_notifyIDLoadingResponses );
		    m_notifyIDLoadingResponses = null;

			if( responseCount > 0 )
			{
				$("#tblResponsesTotal").text( responseCount );
				$("#tblResponses").show();
				$("#divResponsesShowHideFolderPerms").show();
			}
	
			if( oRequest.status == "Open" || oRequest.status == "ReOpened" )
			{
				$("#divResponsesActions").html( '<div><a title="Add Response" href="javascript:void(0)" onclick="Audit.IAReport.Report.AddResponse(\'' + oRequest.number + '\')"><span class="ui-icon ui-icon-circle-plus"></span>Add Response</a></div><div><a title="Bulk Add Responses" href="javascript:void(0)" onclick="Audit.IAReport.Report.BulkAddResponse(\'' + oRequest.number + '\')"><span class="ui-icon ui-icon-circle-plus"></span>Bulk Add Responses</a></div>' );	
			}
			else
				$("#divResponsesActions").html( "" );		
				
			document.body.style.cursor = 'default';
			
			m_fnHighlightResponse();

			LoadTabRequestInfoResponseDocs( oRequest );
		}		
		function OnFailure(sender, args)
		{
			statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace());
   			SP.UI.Status.setStatusPriColor(statusId, 'red');
		}
		currCtx.executeQueryAsync(OnSuccess, OnFailure);		
	}
	
	function m_fnHighlightResponse()
	{
		if( m_sGoToResponseTitle != null && m_sGoToResponseTitle != "" )
		{
			$("[id='response-item-title-" +  m_sGoToResponseTitle + "']").parent().css({"background-color": "palegreen", "font-weight": "inherit"});
			$("[id='response-item-title-" +  m_sGoToResponseTitle + "']").get(0).scrollIntoView();
			
			function resetColor( index )
			{
				$("[id='response-item-title-" +  m_sGoToResponseTitle + "']").parent().css({"background-color": "inherit", "font-weight": "inherit"});

				 m_sGoToResponseTitle = null;
			}
			setTimeout(function(){resetColor( m_sGoToResponseTitle )}, 2000);
		}
	}
	
	function LoadTabRequestInfoResponseDocs( oRequest )
	{	
		$("#divResponseDocsLoading").hide();
		
		function OnSuccess(sender, args)
		{		
			RenderResponses( oRequest );	
		}		
		function OnFailure(sender, args)
		{
			statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace());
   			SP.UI.Status.setStatusPriColor(statusId, 'red');
		}
		
		var bHasResponseDoc = false;
		if( oRequest && oRequest.responses && oRequest.responses.length > 0 )
		{
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();
			
			for( var y = 0; y < oRequest.responses.length; y++ )
			{
				var oResponse = oRequest.responses[y];
				if( oResponse && oResponse.responseDocs && oResponse.responseDocs.length > 0 )
				{
					for( var z = 0; z < oResponse.responseDocs.length; z++ )
					{
						var oResponseDoc = oResponse.responseDocs[z];
						
						//this loads on execute
						oResponseDoc ["docIcon"] = web.mapToIcon( oResponseDoc.fileName, '', SP.Utilities.IconSize.Size16);// m_siteUrl + "/" + _spPageContextInfo.layoutsUrl + "/images/" + docIcon;
						
						bHasResponseDoc = true;
					}
				}
			}
		}
		
		if( bHasResponseDoc )
		{
			currCtx.executeQueryAsync(OnSuccess, OnFailure);	
			$("#divEmptyResponseDocsMsg").hide();
		}
		else
		{
			$("#divEmptyResponseDocsMsg").show();
		}
			
		function RenderResponses( oRequest )
		{
			var sReponseDocs = "";
			var cnt = 0;
						
			oRequest.responses.sort( Audit.Common.Utilities.SortResponseObjects );


			for( var y = 0; y < oRequest.responses.length; y++ )
			{
				var oResponse = oRequest.responses[y];

				var arrResponseSummary = new Array();
				for( var z = 0; z < oResponse.responseDocs.length; z++ )
				{
					var oResponseDoc = oResponse.responseDocs[z];
					
					var bFound = false;
					for( var b = 0; b < arrResponseSummary.length; b++ )
					{
						if( arrResponseSummary[b].responseTitle == oResponse.title )
						{
							bFound = true;
							arrResponseSummary[b].responseDocs.push( oResponseDoc );
							break;
						}
					}
					if( !bFound )
					{
						var oObject = new Object();
						
						var arrResponseDocs = new Array();
						arrResponseDocs.push( oResponseDoc );
						
						oObject["responseTitle"] = oResponse.title;
						oObject["responseDocs"] = arrResponseDocs;
						oObject["response"] = oResponse;
						oObject["request"] = oRequest;
						
						arrResponseSummary.push( oObject );
					}
				}
								
				for( var z = 0; z < arrResponseSummary.length; z++ )
				{
					var oResponseSummary = arrResponseSummary[z];
					
					sReponseDocs += '<tr id="requestInfo-response-docs-' + oResponseSummary.responseTitle + '" class="requestInfo-response-doc"><td colspan="11"><img style="background-color: transparent;" src="/_layouts/images/plus.gif" title="Expand/Collapse"/>' + oResponseSummary.responseTitle + '</td></tr>';

					for( var p = 0; p < oResponseSummary.responseDocs.length; p++ )
					{					
						var oResponseDoc = oResponseSummary.responseDocs[p];
		
						var responseDocLink = "<a title='View Response Document Properties' href='javascript:void(0)' onclick='Audit.IAReport.Report.ViewResponseDoc(\"" + oResponseDoc.ID + "\",\"" + oRequest.ID + "\",\"" + oResponse.title + "\")'><span class='ui-icon ui-icon-search'>View Response Doc</span></a>";
						var responseEditLink = "<a title='Edit Response Document Properties' href='javascript:void(0)' onclick='Audit.IAReport.Report.EditResponseDoc(\"" + oResponseDoc.ID + "\",\"" + oRequest.ID + "\",\"" + oResponse.title + "\")'><span class='ui-icon ui-icon-pencil'>Edit Response Doc</span></a>";

	//Depending on the request/response status, we want to allow the IA team to edit document in the client application. otherwise, force them to download the document
	var onc = "onclick=\"return DispEx(this,event,'TRUE','FALSE','FALSE','SharePoint.OpenDocuments.3','1','SharePoint.OpenDocuments','','','','2','0','0','0x7fffffffffffffff','','')\"";
	var responseDocOpenlink = "<a title='Click to Open the document' onmousedown=\"return VerifyHref(this,event,'1','SharePoint.OpenDocuments','')\" " + onc + " href='" + oResponseDoc.folder + "/" + oResponseDoc.fileName + "'>" + oResponseDoc.fileName + "</a>";
	var responseDocDownloadlink = "<a title='Click to Download' href='../_layouts/download.aspx?SourceUrl=" + oResponseDoc.folder + "/" + oResponseDoc.fileName + "'><span class='ui-icon ui-icon-arrowreturnthick-1-s'>Download Document</span></a>";
						
						if( oResponseSummary.response.resStatus.indexOf("Closed") >= 0 )
						{
							responseEditLink = "";
							responseDocOpenlink = "<a title='Click to Download' href='../_layouts/download.aspx?SourceUrl=" + oResponseDoc.folder + "/" + oResponseDoc.fileName + "'>" + oResponseDoc.fileName + "</a>";
						}
						if( oResponseSummary.request.status == "Closed" || oResponseSummary.request.status == "Canceled")
						{
							responseEditLink = "";
							responseDocOpenlink = "<a title='Click to Download' href='../_layouts/download.aspx?SourceUrl=" + oResponseDoc.folder + "/" + oResponseDoc.fileName + "'>" + oResponseDoc.fileName + "</a>";
						}
						if( oResponseDoc.documentStatus != "Sent to QA" && oResponseDoc.documentStatus != "Open" && oResponseDoc.documentStatus != "Submitted")
						{
							responseEditLink = "";
						}
						
						if( oResponseDoc.documentStatus != "Submitted" )
						{
							//only allow IA to change it if it's their queue
							responseDocOpenlink = "<a title='Click to Download' href='../_layouts/download.aspx?SourceUrl=" + oResponseDoc.folder + "/" + oResponseDoc.fileName + "'>" + oResponseDoc.fileName + "</a>";
						}
		
						var docIcon = "<img src= '" + Audit.Common.Utilities.GetSiteUrl() + "/_layouts/images/" + oResponseDoc.docIcon.get_value() + "'></img>";
						
						


						//var link = "<a href='../_layouts/download.aspx?SourceUrl=" + oResponseDoc.folder + "/" + oResponseDoc.fileName + "'>" + oResponseDoc.fileName + "</a>";
						
						var checkinLink = "";
						if( oResponseDoc.checkedOutBy != "" )
						{
							checkinLink = oResponseDoc.checkedOutBy + ' <img style="background-color: transparent;" src="/_layouts/images/checkin.gif" title="Check In Document"/><a href="javascript:void(0)" title="Check In Document" onclick="Audit.IAReport.Report.CheckInResponseDoc(\'' + oResponseDoc.folder + '\',\'' + oResponseDoc.fileName + '\')">Check In Document</a>';
						}
						
						var styleTag = Audit.Common.Utilities.GetResponseDocStyleTag( oResponseDoc.documentStatus );

						var deleteLink = "";
						var resendToQALink = "";
						if( (oResponseDoc.documentStatus == "Open" || oResponseDoc.documentStatus == "Marked for Deletion" ) && ( oResponseSummary.request.status == "Open" || oResponseSummary.request.status == "ReOpened" ) )
							deleteLink = "<span style='float:right'><a title='Delete Response Document' href='javascript:void(0)' onclick='Audit.IAReport.Report.DeleteResponseDoc(\"" + oResponseDoc.ID + "\")'><span class='ui-icon ui-icon-trash'>Delete Response Document</span></a></span>";					
						else if( oResponseDoc.documentStatus == "Rejected" && ( oResponseSummary.request.status == "Open" || oResponseSummary.request.status == "ReOpened" ) )
						{
							resendToQALink = "<span><a title='Clear Rejected Status' href='javascript:void(0)' onclick='Audit.IAReport.Report.ResendRejectedResponseDocToQA(\"" + oResponseDoc.ID + "\")'><span class='ui-icon ui-icon-circle-check'>Clear Rejected Status</span></a></span>";					
						}

						if( oResponseDoc.documentStatus == "Marked for Deletion" )//decided later that marked for deletion shouldn't be shown to IA to avoid confusion
							continue; 
							
						sReponseDocs += '<tr class="requestInfo-response-doc-item collapsed" ' + styleTag + '>' + 
							'<td>' + docIcon + '</td>' +
							'<td class="requestInfo-response-doc-title">' + responseDocOpenlink + deleteLink + '</td>' +
							'<td nowrap>' + oResponseDoc.title + '</td>' +
							'<td nowrap>' + oResponseDoc.receiptDate + '</td>' +
							'<td nowrap>' + oResponseDoc.fileSize + '</td>' +
							'<td nowrap>' + checkinLink + '</td>' +
							'<td style="white-space: nowrap;">' + oResponseDoc.documentStatus + resendToQALink + '</td>' +
							'<td>' + oResponseDoc.rejectReason + '</td>' +
							'<td class="requestInfo-response-doc-modified">' + oResponseDoc.modifiedDate + '</td>' +
							'<td class="requestInfo-response-doc-modifiedBy">' + oResponseDoc.modifiedBy + '</td>' +
							'<td style="white-space: nowrap;" class="requestInfo-response-doc-action">' + responseDocDownloadlink + responseDocLink + responseEditLink + '</td>' +
						'</tr>';
						cnt++;
					}
				}
			}
			
			$("#tblResponseDocs tbody").append( sReponseDocs );
			if( cnt > 0 )
			{
				$("#tblResponseDocsTotal").text( cnt );
				$("#tblResponseDocs").show();
			}
		
			Audit.Common.Utilities.BindHandlerResponseDoc();
		}
	}
	
	function DisplayCheckedOutFiles( arr )
	{
		$("#divCheckedOutResponseDocs").hide();
		
		var sCheckedOutFiles = "<ul>";
		for( var x = 0; x < arr.length; x ++ )
		{
			var oResponseDoc = arr[x];

			var responseTitle = oResponseDoc ["title"] + " (" + oResponseDoc ["checkedOutBy"] + ")";
			var oRequest = oResponseDoc ["request"];

			var link = "<a href=\"javascript:void(0);\" title='Go to Request Details' onclick='Audit.IAReport.Report.GoToRequest(\"" + oRequest.number  + "\")'>" + responseTitle + "</a>";

			sCheckedOutFiles += "<li>" + link + "</li>";
		}
		sCheckedOutFiles += "</ul>";

		if( arr.length > 0 )
		{
			$("#divCheckedOutResponseDocsItems").html( sCheckedOutFiles );
			$("#divCheckedOutResponseDocs").show();
		}
		else
		{
			$("#divCheckedOutResponseDocsItems").html( "" );
		}
	}

	function DisplayRequestsThatShouldClose()
	{		
		$("#divRequestsThatNeedToClose").hide();

		if( m_arrRequests == null || m_arrRequests.length == 0 )
			return;
		
		m_arrRequestsToClose = new Array();	
		for( var x = 0; x < m_arrRequests.length; x ++ )
		{
			var oRequest =  m_arrRequests[x];
						
			if(oRequest.status != "Closed") //check if all responses are closed
			{
				var countClosed = 0;
				for( var y = 0; y < oRequest.responses.length; y++ )
				{
					if( oRequest.responses[y].resStatus == "7-Closed")
					{
						countClosed++;
					}
				}
				
				if( oRequest.responses.length > 0 && oRequest.responses.length == countClosed )
				{
					var lastClosedDate = null;
					var lastClosedBy = null;
					var lastResponseId = null;
					var oResponse = null;
					for( var y = 0; y < oRequest.responses.length; y++ )
					{
						var closedDate = oRequest.responses[y].item.get_item('ClosedDate');
						if ( lastClosedDate == null || lastClosedDate < closedDate )
						{
							lastClosedDate = closedDate;
							lastClosedBy = oRequest.responses[y].closedBy;
							lastResponseId = oRequest.responses[y].title;
							oResponse = oRequest.responses[y];
						}
					}				
					
					m_arrRequestsToClose.push( {requestNumber: oRequest.number, lastResponseId: lastResponseId, lastClosedDate: lastClosedDate , lastClosedBy : lastClosedBy, oResponse: oResponse} );
				}
			}
		}	
		
		if( m_arrRequestsToClose.length > 0 )
		{
			$("#divRequestsThatNeedToClose").show();

			var sRequestsToClose = "";
			for( var x = 0; x < m_arrRequestsToClose.length; x ++ )
			{
				var oIt = m_arrRequestsToClose[x];
				
				var sLastClosedDate = "";
				if( oIt.lastClosedDate != null && oIt.lastClosedDate != "" )
					sLastClosedDate = oIt.lastClosedDate.format("MM/dd/yyyy hh:mm tt");
				
				//sRequestsToClose += "<tr><td>" + oIt.requestNumber + "</td><td><b>" +  oIt.lastResponseId + "</b> on <b>" + sLastClosedDate + "</b> by <b>" + oIt.lastClosedBy + "</b></td><td><a href='javascript:void(0)' title='Click here to Close this Request' onClick='Audit.IAReport.Report.CloseRequest(\"" + oIt.requestNumber  + "\")'>Close Request</a></td></tr>";
				//making user go to the request so that on 3rd tab, the permissions on the request have loaded					
				sRequestsToClose += "<tr><td>" + oIt.requestNumber + "</td><td><b>" +  oIt.lastResponseId + "</b> on <b>" + sLastClosedDate + "</b> by <b>" + oIt.lastClosedBy + "</b></td><td><a href='javascript:void(0)' title='Click here to Go to this Request' onClick='Audit.IAReport.Report.GoToRequest(\"" + oIt.requestNumber  + "\")'>Go to Request</a></td></tr>";
			}	

			$("#tblRequestsThatNeedToClose tbody").empty().append( sRequestsToClose );
		}
	}
	
	function LoadTabStatusReport1(arr, fbody)
	{		
		var body = $('#' + fbody);
		body.empty();
		body.html('');		
		
		if( arr == null )
			return;

		var myRequestTmpl = $.templates('<tr class="sr1-request-item">' + 
			'<td class="sr1-request-requestNum">{{:number}}</td>' + 
			'<td class="sr1-request-subject">{{:subject}}</td>' + 
			'<td class="sr1-request-status">{{:status}}</td>' +
			'<td class="sr1-request-internalDueDate" {{:internalDueDateStyle}}>{{:internalDueDate}}</td>' + 
			'<td class="sr1-request-dueDate" {{:dueDateStyle}}>{{:dueDate}}</td>' +
			'<td class="sr1-request-sample">{{:sample}}</td>' +
			'<td class="sr1-request-sentEmail">{{:sentEmail}}</td>' +
			'<td class="sr1-request-actionOffice">{{:actionOffice}}</td>' +
			'<td class="sr1-request-responseCount">{{:responseCount}}</td>' + 
			'<td class="sr1-request-responsesOpenCount">{{:responsesOpenCount}}</td>' + 
			'<td class="sr1-request-responseDocCount">{{:responseDocCount}}</td>' + 
			'</tr>');
		var requestArr = new Array();

		var arrInternalAlmostDue = new Array();
		var arrInternalPastDue = new Array();
		var arrAlmostDue = new Array();
		var arrPastDue = new Array();
		var arrRequestsWithNoResponses = new Array();
		var arrRequestsWithNoEmailSent = new Array();

		//var r = new Array(), j = -1;
		
		var arrLength = arr.length; 
		//for( var x = 0; x < arrayLength; x++ )
		while ( arrLength-- ) 
		{
			var oRequest = arr[ arrLength ];
					
			var sample = Audit.Common.Utilities.GetTrueFalseIcon( oRequest.sample );
			var emailSent = Audit.Common.Utilities.GetTrueFalseIcon( oRequest.emailSent );

			var link = "<a href=\"javascript:void(0);\" title='Go to Request Details' onclick='Audit.IAReport.Report.GoToRequest(\"" + oRequest.number  + "\")'>" + oRequest.number + "</a>";

			var internalDueDateStyle = "";
			var dueDateStyle = "";
			if( m_fnIsRequestPastDue( oRequest, 0 ) )
			{
				internalDueDateStyle = ' style="background-color:salmon; font-weight:bold" title="Past Due"';
				arrInternalPastDue.push( [oRequest.number, oRequest.number] );
			}
			else if( m_fnIsRequestAlmostDue( oRequest, 0 ) )
			{
				internalDueDateStyle = ' style="background-color:coral; font-weight:bold" title="Almost Due"';				
				arrInternalAlmostDue.push( [oRequest.number, oRequest.number] );
			}
			
			if( m_fnIsRequestPastDue( oRequest, 1 ) )
			{
				dueDateStyle = ' style="background-color:salmon; font-weight:bold" title="Past Due"';				
				arrPastDue.push( [oRequest.number, oRequest.number] );
			}
			else if( m_fnIsRequestAlmostDue( oRequest, 1 ) )
			{
				dueDateStyle = ' style="background-color:coral; font-weight:bold" title="Almost Due"';				
				arrAlmostDue.push( [oRequest.number, oRequest.number] );
			}
			
			if( oRequest.responses.length == 0 )
			{
				arrRequestsWithNoResponses.push( [oRequest.number, oRequest.number] );
			}
			
			if( !oRequest.emailSent )
			{
				arrRequestsWithNoEmailSent.push( [oRequest.number, oRequest.number] );
			}
			
			var resCount = m_oRequestTitleAndDocCount[ oRequest.number ];
			if( !resCount )
				resCount = 0;
			
			
			var aRequest = { 
				number: link , 
				subject: oRequest.subject, 
				status: oRequest.status, 
				internalDueDate: oRequest.internalDueDate, 
				dueDate: oRequest.dueDate, 
				internalDueDateStyle: internalDueDateStyle, 
				dueDateStyle: dueDateStyle, 
				sample: sample,
				sentEmail: emailSent,
				actionOffice: oRequest.actionOffice,
				responseCount: oRequest.responses.length,
				responsesOpenCount: oRequest.responsesOpenCnt,
				responseDocCount: resCount
			};
			requestArr.push( aRequest );
		}
		
		var html = myRequestTmpl.render( requestArr );
		body.html( html );

		$("#spanRequestsTotal").text( arr.length );
		$("#spanRequestsDisplayedTotal").text( arr.length );
				
		DisplayErrorMsg ( arrInternalAlmostDue, "divRequestsAlmostInternalDue", "divRequestsAlmostInternalDueItems");
		DisplayErrorMsg ( arrAlmostDue, "divRequestsAlmostDue", "divRequestsAlmostDueItems");
		DisplayErrorMsg ( arrInternalPastDue, "divRequestsPastInternalDue", "divRequestsPastInternalDueItems");
		DisplayErrorMsg ( arrPastDue, "divRequestsPastDue", "divRequestsPastDueItems");
		DisplayErrorMsg ( arrRequestsWithNoResponses, "divRequestsWithNoResponse", "divRequestsWithNoResponseItems");		
		DisplayErrorMsg ( arrRequestsWithNoEmailSent, "divRequestsWithNoEmailSent", "divRequestsWithNoEmailSentItems");		
				
		setTimeout( function()
		{
			BindTableSorter( 0, m_arrRequests.length, "tblStatusReportRequests"); //do this after updating the response doc count on tab1 so that sorting on column works
		}, 200 );
	}
	
	function DisplayErrorMsg( arr, container, containerItems )
	{
		if( arr == null ) return;
		
		if( arr.length > 0 )
		{
			var msg = "<ul>";
			for( var x = 0; x < arr.length; x++ )
			{
				if( arr[x][2] == null )
					var link = "<a href=\"javascript:void(0);\" title='Go to Request Details' onclick='Audit.IAReport.Report.GoToRequest(\"" + arr[x][1]  + "\")'>" + arr[x][0] + "</a>";
				else //this will go to response on the 3rd tab
					var link = "<a href=\"javascript:void(0);\" title='Go to Request Details' onclick='Audit.IAReport.Report.GoToRequest(\"" + arr[x][1]  + "\",\"" + arr[x][2]  + "\")'>" + arr[x][0] + "</a>";
				msg += "<li>" + link  + "</li>";
			}
			msg += "</ul>";
			
			$("#" + container).show();
			$("#" + containerItems ).html( msg );
		}
	}

	function LoadTabStatusReport2(arr, fbody)
	{		
		var body = $('#' + fbody);				
		body.empty();
		body.html('');		
		
		if( arr == null )
			return;

		var arrSubmittedResponsesByAO = new Array();

		var myTmpl = $.templates('<tr class="sr2-response-item" style="display:none">' + 
			'<td class="sr2-response-requestNum">{{:reqNumber}}</td>' + 
			'<td class="sr2-response-sample">{{:sample}}</td>' +
			'<td class="sr2-response-title">{{:title}}</td>' + 
			'<td class="sr2-response-internalDueDate">{{:internalDueDate}}</td>' + 
			'<td class="sr2-response-status">{{:status}}</td>' +
			'<td class="sr2-response-ao">{{:ao}}</td>' +
			'<td class="sr2-response-docCount">{{:docCount}}</td>' + 
			'<td class="sr2-response-modified">{{:modified}}</td>' + 
			'</tr>');
		var responseArr = new Array();

		var cnt = 0;
//		var r = new Array(), j = -1;
 
		var requestLength = arr.length;
		for( var x = 0; x < requestLength; x++ )
//		while ( requestLength-- ) 
		{
			var oRequest = arr[ x ];
					
			var responseLength = oRequest.responses.length;
			for( var y = 0; y < responseLength; y++ )
			{			
				var oResponse = oRequest.responses[y];

				var responseTitle = oResponse.title;
				var responseStatus = oResponse.resStatus;
				
				var link = "<a href=\"javascript:void(0);\" title='Go to Request Details' onclick='Audit.IAReport.Report.GoToRequest(\"" + oRequest.number  + "\", \"" + responseTitle  + "\")'>" + oRequest.number + "</a>";
				
				var resCount = m_oResponseTitleAndDocCount[ oResponse.title ];
				if( !resCount )
					resCount = 0;
					
				var aResponse = { 
					reqNumber: link, 
					sample: oResponse.sample, 
					title: responseTitle, 
					internalDueDate: oRequest.internalDueDate, 
					status: responseStatus, 
					ao: oResponse.actionOffice, 
					docCount: resCount, 
					modified: oResponse.modified};
				responseArr.push( aResponse );

				cnt++;			
				
				if( oResponse.resStatus == "2-Submitted")
					arrSubmittedResponsesByAO.push( [oResponse.title, oRequest.number, oResponse.title] );
			}	
		}

		var html = myTmpl.render( responseArr );
		body.html( html );
		$("#tabs").tabs().show();
		
		$("#spanResponsesTotal").text( cnt );
		$("#spanResponsesDisplayedTotal").text( cnt );
	
		DisplayErrorMsg ( arrSubmittedResponsesByAO, "divResponsesSubmitted", "divResponsesSubmittedItems");
		
		setTimeout( function()
		{		
			Audit.Common.Utilities.OnLoadDisplayTimeStamp();
			LoadDDOptionsTbl();
			$(".rowFilters").show();
			BindHandlersOnLoad();		
	
			OnLoadDisplayTabAndRequest();		

			BindTableSorter( 1, cnt, "tblStatusReportResponses"); //do this after updating the response doc count on tab2 so that sorting on column works
		}, 100 );
	}

	function m_fnViewLateRequests()
	{
		window.open(Audit.Common.Utilities.GetSiteUrl() + "/pages/AuditReport_RequestsStatus.aspx", "_blank");
	}

	function m_fnViewPermissions()
	{
		window.open(Audit.Common.Utilities.GetSiteUrl() + "/pages/AuditPermissions.aspx", "_blank");
	}
	
	function m_fnViewResponseDocsToday( )
	{
		window.open(Audit.Common.Utilities.GetSiteUrl() + "/pages/AuditUnSubmittedResponseDocuments.aspx", "_blank");
	}
	
/*	function m_fnGoToResponseDocs( responseTitle )
	{
	
		try
		{		
			//tr
			var responseDocExpandable = $(".requestInfo-response-doc:contains('" + responseTitle + "')");
			
			if( responseDocExpandable.html() == null || responseDocExpandable.html() == "" )
			{
				SP.UI.Notify.addNotification("There are 0 response documents to show", false);
			}
			else
			{
				//responseDocExpandable.find("img").get(0).scrollIntoView();
				responseDocExpandable.find("img").trigger( "click" );
				//responseDocExpandable.find("img").get(0).scrollIntoView();
			}
		}catch(err){}
	}
*/	
	function m_fnIsRequestAlmostDue( oRequest, type )
	{
		var todayDate = new Date();
		var dueDate = null;
		if( type == 0 )
			dueDate = oRequest.internalDueDate;
		else if( type == 1 )
			dueDate = oRequest.dueDate;

		if( dueDate == null || dueDate == "" )
			return false;

		dueDate = new Date( dueDate );
		
		var one_day = 1000*60*60*24;
		var difference = Math.ceil( (todayDate.getTime() - dueDate.getTime())/(one_day) );
		
		if( (oRequest.status == "Open" || oRequest.status == "ReOpened") && difference >= 0 && difference <= 3 )
		{
			return true;
		}
		
		return false;
	}

	function m_fnIsRequestPastDue( oRequest, type )
	{
		var todayDate = new Date();
		var dueDate = null;
		if( type == 0 )
			dueDate = oRequest.internalDueDate;
		else if( type == 1 )
			dueDate = oRequest.dueDate;
		
		if( dueDate == null || dueDate == "" )
			return false;

		dueDate = new Date( dueDate );

		if( (oRequest.status == "Open" || oRequest.status == "ReOpened") && todayDate.getTime() >= dueDate.getTime() )
		{
			return true;
		}
		
		return false;
	}
	
	function m_fnCreateRequest()
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;
		
		var formName = "CustomNewForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Create a new Request";
		options.dialogReturnValueCallback = OnCallbackFormNewRequest;

		options.url = Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameRequests() + "/" + formName + "?Source=" + location.pathname;

		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnViewRequest( id ) 
	{	
		m_bIsTransactionExecuting = true;
		
		var formName = "DispForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "View Request (ID:" + id + ")";
		options.height = 850;
		options.dialogReturnValueCallback = OnCallbackForm;

		options.url = Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameRequests() + "/" + formName + "?ID=" + id + GetSourceUrlForForms();

		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnEditRequest( id, requestNum ) 
	{		
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		m_itemID = id;
		m_requestNum = requestNum;
		
		var formName = "EditForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Edit Request (" + requestNum + ")";
		options.dialogReturnValueCallback = OnCallbackFormEditRequest;
		
		//pass in request number so that the list form knows it came from the IA db and prevents saves otherwise
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameRequests() + "/" + formName + "?ID=" + id + "&ReqNum=" + requestNum + GetSourceUrlForForms();

		SP.UI.ModalDialog.showModalDialog(options);
	}
		
	function m_fnViewRequestDoc( id ) 
	{		
		m_bIsTransactionExecuting = true;

		var formName = "DispForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "View Request Doc (ID:" + id + ")";
		options.dialogReturnValueCallback = OnCallbackForm;

		options.url = Audit.Common.Utilities.GetSiteUrl() + "/"+ Audit.Common.Utilities.GetLibNameRequestDocs() + "/Forms/" + formName + "?ID=" + id + GetSourceUrlForForms();

		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnEditRequestDoc( id ) 
	{		
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		var formName = "CustomEditForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Edit Request Doc (ID:" + id + ")";
		options.height = "600";
		options.dialogReturnValueCallback = OnCallbackForm;

		options.url = Audit.Common.Utilities.GetSiteUrl() + "/"+ Audit.Common.Utilities.GetLibNameRequestDocs() + "/Forms/" + formName + "?ID=" + id + GetSourceUrlForForms();

		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnUploadRequestDoc( requestNum )
	{	
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		var options = SP.UI.$create_DialogOptions();	
		options.title = "Upload Request Document to: " +  requestNum ;
		options.dialogReturnValueCallback = OnCallbackForm;

		var rootFolder = Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameRequestDocs();
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/_layouts/Upload.aspx?List=" + m_libRequestDocsLibraryGUID + "&RootFolder=" + rootFolder + "&ReqNum=" + requestNum + GetSourceUrlForForms();
		//notifyId = SP.UI.Notify.addNotification("Uploading documents to: " + options.url, false);
		SP.UI.ModalDialog.showModalDialog(options);
	}

	function m_fnViewCoverSheet( id ) 
	{		
		m_bIsTransactionExecuting = true;

		var formName = "DispForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "View Coversheet (ID:" + id + ")";
		options.dialogReturnValueCallback = OnCallbackForm;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/"+ Audit.Common.Utilities.GetLibNameCoverSheets() + "/Forms/" + formName + "?ID=" + id + GetSourceUrlForForms();
		
		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnEditCoverSheet( id, requestNum) 
	{		
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		var formName = "CustomEditForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Edit Coversheet (ID:" + id + ")";
		options.height = "600";
		options.dialogReturnValueCallback = OnCallbackFormCoverSheet;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/"+ Audit.Common.Utilities.GetLibNameCoverSheets() + "/Forms/" + formName + "?ID=" + id + "&ReqNum=" + requestNum + GetSourceUrlForForms();
		
		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnUploadCoverSheet( requestNum )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		var options = SP.UI.$create_DialogOptions();	
		options.title = "Upload Cover Sheet/Supplemental Document to: " +  requestNum;
		options.dialogReturnValueCallback = OnCallbackFormCoverSheet;

		var rootFolder = Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameCoverSheets();
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/_layouts/Upload.aspx?List=" + m_libCoverSheetLibraryGUID + "&RootFolder=" + rootFolder + "&ReqNum=" + requestNum + GetSourceUrlForForms();		
		//notifyId = SP.UI.Notify.addNotification("Uploading documents to: " + options.url, false)
		
		SP.UI.ModalDialog.showModalDialog(options);
	}

	function m_fnBulkAddResponse( id )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;
		
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Bulk Add Responses (" + id + ")";
		options.dialogReturnValueCallback = OnCallbackFormBulkAddResponse;
		options.height = 800;
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/pages/AuditBulkAddResponse.aspx?ReqNum=" + id + GetSourceUrlForForms();
		
		SP.UI.ModalDialog.showModalDialog(options);		
	}

	function m_fnGetNextSampleNumber( id )
	{
		var sampleNumber = 0;
		for( var x = 0; x < m_arrRequests.length; x ++ )
		{
			if( m_arrRequests[x].number == id )
			{
				for( var y = 0; y < m_arrRequests[x].responses.length; y++ )
				{
					if( m_arrRequests[x].responses[y].sample > sampleNumber )
						sampleNumber = m_arrRequests[x].responses[y].sample;
				}
				
				if( m_arrRequests[x].responses.length > 0 )
					sampleNumber++;
					
				break;
			}
		}
		return sampleNumber;
	}
	
	function m_fnAddResponse( id ) 
	{		
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;
		
		var sampleNumber = m_fnGetNextSampleNumber( id );	
	
		var formName = "CustomNewForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Add Response to (Request Number:" + id + ")";
		options.dialogReturnValueCallback = OnCallbackFormNewResponse;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameResponses() + "/" + formName + "?ReqNum=" + id + "&Sample=" + sampleNumber;
		
		SP.UI.ModalDialog.showModalDialog(options);
	}

	function m_fnViewResponse( requestNumber, id, responseTitle, responseStatus ) 
	{		
		m_bIsTransactionExecuting = true;

		//in case they click edit item from the view form
		m_requestNum = requestNumber;
		m_itemID = id;
		m_responseTitle = responseTitle;
		m_responseStatus = responseStatus;
	
		var formName = "DispForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "View Response (" + responseTitle + ")";
		options.height = 600;
		options.dialogReturnValueCallback = OnCallbackForm;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameResponses() + "/" + formName + "?ID=" + id + GetSourceUrlForForms();
		
		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnEditResponse( requestNumber, id, responseTitle, responseStatus ) 
	{	
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		m_requestNum = requestNumber;
		m_itemID = id;
		m_responseTitle = responseTitle;
		m_responseStatus = responseStatus;
	
		var formName = "CustomEditForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Edit Response (" + responseTitle + ")";
		options.dialogReturnValueCallback = OnCallbackFormEditResponse;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameResponses() + "/" + formName + "?ID=" + id + GetSourceUrlForForms();
		
		SP.UI.ModalDialog.showModalDialog(options);
	}

	function m_fnViewResponseDoc( id, requestID, responseID ) 
	{			
		m_bIsTransactionExecuting = true;

		var formName = "DispForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "View Response Doc (ID:" + id + ")";
		options.height = "600";
		options.dialogReturnValueCallback = OnCallbackForm;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/"+ Audit.Common.Utilities.GetLibNameResponseDocs() + "/Forms/" + formName + "?ID=" + id + "&ReqNum=" + requestID + "&ResID=" + responseID + GetSourceUrlForForms();
		
		//alert( options.url );
		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnEditResponseDoc( id, requestID, responseID ) 
	{		
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		//unable to use custom edit form in the document library because of folders
		var formName = "EditForm.aspx";
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Edit ResponseDoc (ID:" + id + ")";
		options.dialogReturnValueCallback = OnCallbackForm;
				
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/"+ Audit.Common.Utilities.GetLibNameResponseDocs() + "/Forms/" + formName + "?ID=" + id + "&ReqNum=" + requestID + "&ResID=" + responseID + GetSourceUrlForForms();
		//alert( options.url );
		
		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnCheckInResponseDoc( folder, fileName )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;

		var options = SP.UI.$create_DialogOptions();	
		options.title = "Check in Response Document";
		options.height = "600";
		options.dialogReturnValueCallback = OnCallbackForm;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/_layouts/checkin.aspx?List={" + m_libResponseDocsLibraryGUID + "}&FileName=" + folder + "/" + fileName ;	

		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	function m_fnViewResponseDocFolder( title )
	{
		m_bIsTransactionExecuting = true;

		var options = SP.UI.$create_DialogOptions();	
		options.title = "View Response Folder";
		options.height = "600";
		options.dialogReturnValueCallback = OnCallbackForm;
		
		//if they delete a document in this window, we want them to return to the current page
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/pages/AuditResponseDocs.aspx?RootFolder=" + Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameResponseDocs() + "/" + title;	
		//options.url = Audit.Common.Utilities.GetSiteUrl() + "/pages/AuditResponseDocs.aspx?RootFolder=" + Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameResponseDocs() + "/" + title + GetSourceUrlForForms();	
		//options.url = m_siteUrl + "/"+ m_libNameResponseDocs + "/" + title;	
		//options.url = m_siteUrl + "/"+ m_libNameResponseDocs + "?RootFolder=" + m_siteUrl + "/"+ m_libNameResponseDocs + "/" + title;
		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	
	function m_fnViewEmailHistoryFolder( reqNum )
	{
		m_bIsTransactionExecuting = true;

		var options = SP.UI.$create_DialogOptions();	
		options.title = "View Email History";
		//options.height = "600";
		//options.width = "900";
		options.autoSize = true;
		options.dialogReturnValueCallback = OnCallbackForm;
		
		options.url = Audit.Common.Utilities.GetSiteUrl() + "/pages/AuditEmailHistory.aspx?RootFolder=" + Audit.Common.Utilities.GetSiteUrl() + "/Lists/"+ Audit.Common.Utilities.GetListNameEmailHistory() + "/" + reqNum + GetSourceUrlForForms();	
		
		SP.UI.ModalDialog.showModalDialog(options);
	}
	
	//A response doc should end up in a folder under the response doc library and have the request ID and response ID specified
	function m_fnUploadResponseDoc( requestID, responseID )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		m_bIsTransactionExecuting = true;
		//notifyId = SP.UI.Notify.addNotification("<span style='font-size:11pt'><span class='ui-icon ui-icon-info'></span>Please <span style='font-weight:bold; color:green'>zip</span> the documents you are uploading.</span>", false);
		
		var waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Loading...", "<span style='font-size:11pt'><span class='ui-icon ui-icon-info'></span>If you are uploading <span style='font-weight:bold; color:green;text-decoration:underline'>multiple</span> documents, please <span style='font-weight:bold; color:green;text-decoration:underline'>zip </span> them.</span>", 100, 600);
		
		setTimeout( function()
		{
			waitDialog.close();
			
			var options = SP.UI.$create_DialogOptions();	
			options.title = "Upload Response Document to: " +  responseID;
			options.dialogReturnValueCallback = OnCallbackForm;
	
			//this subfolder should have been created when the response was created
			var rootFolder = Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameResponseDocs() + "/" + responseID;
			
			options.url = Audit.Common.Utilities.GetSiteUrl() + "/_layouts/Upload.aspx?List=" + m_libResponseDocsLibraryGUID + "&RootFolder=" + rootFolder + "&ReqNum=" + requestID + "&ResID=" + responseID;
			//notifyId = SP.UI.Notify.addNotification("Uploading documents to: " + options.url, false)
			SP.UI.ModalDialog.showModalDialog(options);
		}, 3000);
	}
	
	function m_fnDeleteResponseDoc( itemID )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		if( confirm("Are you sure you would like to Delete this Response Document?") )
		{
			m_bIsTransactionExecuting = true;

			var currCtx = new SP.ClientContext(); 
			var responseDocsLib = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibNameResponseDocs() );

		    var oListItem = responseDocsLib.getItemById( itemID );		
		    oListItem.recycle();
		
			function OnSuccess(sender, args)
			{		
				m_fnRefresh();
			}		
			function OnFailure(sender, args)
			{
				statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
	   			SP.UI.Status.setStatusPriColor(statusId, 'red');
			}
			currCtx.executeQueryAsync(OnSuccess, OnFailure);	
		}
	}
	
	function m_fnResendRejectedResponseDocToQA( itemID )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		if( confirm("Are you sure you would like to Update the Response Document status by clearing the Rejected status marked by QA?") )
		{
			m_bIsTransactionExecuting = true;

			var currCtx = new SP.ClientContext(); 
			var responseDocsLib = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibNameResponseDocs() );

		    var oListItem = responseDocsLib.getItemById( itemID );
			oListItem.set_item("DocumentStatus", "Submitted");
			oListItem.set_item("RejectReason", "");
			oListItem.update();
					
			function OnSuccess(sender, args)
			{		
				m_fnRefresh();
			}		
			function OnFailure(sender, args)
			{
				statusId = SP.UI.Status.addStatus("Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
	   			SP.UI.Status.setStatusPriColor(statusId, 'red');
			}
			currCtx.executeQueryAsync(OnSuccess, OnFailure);	
		}
	}
	
	//if request is closed, re-open request and reset perms
	//reset perms on response
	function m_fnReOpenResponse( requestNumber, responseTitle )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		if( confirm( "Are you sure you would like to re-open this response (" + responseTitle + ")?" ))
		{
			m_bIsTransactionExecuting = true;
			
			document.body.style.cursor = 'wait';
		
			var currCtx2 = new SP.ClientContext.get_current();

			//for( var y = 0; y < m_arrRequests.length; y++ )
			//{
			//	if( m_arrRequests[y].number == requestNumber )
			//	{	
			
			var oRequestBigMap = m_bigMap["request-" + requestNumber];
			if( oRequestBigMap )
			{ 													
					for( var z = 0; z < oRequestBigMap .responses.length; z++ )
					{
						//update the status of the response to open
						if( oRequestBigMap.responses[z].title == responseTitle )
						{
							oRequestBigMap.responses[z].item.set_item("ResStatus", "1-Open");
							oRequestBigMap.responses[z].item.update();
							m_fnBreakResponseAndFolderPermissions( "ReOpened", oRequestBigMap.responses[z], false, true, false, false );
		
							break;
						}
					}
					
					//make sure the status of the request is open
					//Todo: check here if request was closed, that it's now Reopened. If it was closed or canceled, open it. if it was open, do nothing to request
					var oListItem = oRequestBigMap.item;	
					var curRequestStatus = oListItem.get_item("ReqStatus");
					if( curRequestStatus == "Closed" )
					{
						oListItem.set_item("ReqStatus", "ReOpened");
						oListItem.update();
					}
					else if ( curRequestStatus != "Open" ) 
					{
						oListItem.set_item("ReqStatus", "Open");					
						oListItem.update();
					}
					
					m_fnBreakRequestPermissions(oListItem, false );	
					//break;
				//}
			//}
			}
			
			currCtx2.executeQueryAsync
			(
				function () 
				{					
					setTimeout( function(){ m_fnRefresh()}, 1000 ); //add delay on this so that the other requests can refresh permissions and it will display properly
				}, 
				function (sender, args) 
				{
					alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
					setTimeout( function(){ m_fnRefresh()}, 1000 ); //add delay on this so that the other requests can refresh permissions and it will display properly
				}
			);
						
		}
	}
	
	function m_fnCloseRequest()
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}
		
		var requestNumberToClose = $("#ddlReqNum").val();

		if( confirm("Are you sure you would like to Close this Request (" + requestNumberToClose + ")?" ) )
		{
			m_bIsTransactionExecuting = true;

			for( var x = 0; x < m_arrRequestsToClose.length; x++ )
			{
				var oIt = m_arrRequestsToClose[x];
				var requestNumber = oIt.requestNumber;
				
				if( requestNumberToClose != requestNumber )
					continue;
					
				var closedDate = oIt.lastClosedDate;
				var closedBy = oIt.lastClosedBy;
				
				var oRequest = m_fnGetRequestByNumber( requestNumber );
								
				oRequest.item.set_item( "ClosedDate", oIt.oResponse.item.get_item("ClosedDate"));			
				oRequest.item.set_item( "ClosedBy", oIt.oResponse.item.get_item("ClosedBy"));
				oRequest.item.set_item( "ReqStatus", "Closed");			
					
				oRequest.item.update();
				
				m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Information", "Please wait... updating permissions on the Request", 100, 600);
//Removed 06/05/2017 m_fnBreakRequestPermissions( oRequest.item, true );
				m_fnBreakRequestPermissions( oRequest.item, false );


//Added 06/05/2017			
				//ensure this will always update the permissions
				var doneUpdatingResponses = false;
				m_fnUpdateAllResponsePermissions( "Closed", requestNumberToClose, true, function( doneUpdatingResponses )
				{
					if( doneUpdatingResponses )
					{	
						setTimeout( function(){ m_fnRefresh()}, 100 );
														
						//defined in another function
						//m_fnUpdateEmailFolderPerms( requestNumberToClose, true );
					}
				} );
				
				break;
			}
		}
	}
	
	function m_fnDisplayHelpResponseDocs()
	{
		var helpDlg = "<div id='helpDlg' style='padding:20px; height:100px; width:700px'>" + 
		"<div style='padding:20px;'><fieldset><legend>Response Document Status</legend> <ul style='padding-top:10px;'>" + 
			"<li style='padding-top:5px;'><b>Open</b> - Uploaded by the Action Office but not yet submitted to the Internal Auditor</li>" + 
			"<li style='padding-top:5px;'><b>Submitted</b> - Submitted to the Internal Auditor by the Action Office</li>" + 
			"<li style='padding-top:5px;'><b>Sent to QA</b> - Submitted to the Quality Assurance team by the Internal Auditor</li>" + 
			"<li style='padding-top:5px;'><b>Approved</b> - Approved by the Quality Assurance team and submitted to the External Auditor</li>" + 
			"<li style='padding-top:5px;'><b>Rejected</b> - Rejected by the Quality Assurance team and returned to the Internal Auditor</li>" + 
			"<li style='padding-top:5px;'><b>Archived</b> - Previously Rejected by the Quality Assurance team and is now read-only for record keeping</li>" + 
			"</ul></fieldset></div>" + 	
			"<table style='padding-top:10px; width:200px; float:right;'>" + 
				"<tr><td class='ms-separator'>&#160;</td><td><input id='btnCancel' type='button' class='ms-ButtonHeightWidth' value='Close' title='Close Help' onclick='SP.UI.ModalDialog.commonModalDialogClose(SP.UI.DialogResult.cancel)'/></td></tr>" + 
			"</table></div>";
		
		$('body').append( helpDlg );
		
		var options = SP.UI.$create_DialogOptions();	
		options.title = "Response Documents Help";
		options.height = 300;
		options.dialogReturnValueCallback = OnCallbackForm;
		options.html = document.getElementById("helpDlg");
		SP.UI.ModalDialog.showModalDialog(options);

	}
	
	
	function m_fnGetRequestByNumber ( requestNumber )
	{
		//this can be stale... 
		var oRequest = null;
		oRequest = m_bigMap["request-" + requestNumber];
		/*for( var x = 0; x < m_arrRequests.length; x++ )
		{
			if( m_arrRequests[x].number == requestNumber )
			{
				oRequest = m_arrRequests[x];
				break;
			}
		}*/
		return oRequest;
	}

	function m_fnGetRequestByID( requestID )
	{
		var oRequest = null;
		for( var y = 0; y < m_arrRequests.length; y++ )
		{
			if( m_arrRequests[y].ID == requestID )
			{
				oRequest = m_arrRequests[y];
				break;
			}
		}
		
		return oRequest;
	}
	
	function m_fnFormatEmailBodyToAO ( oRequest, responseTitles, poc )
	{
		var emailText = "<div>Audit Request Reference: <b>{REQUEST_NUMBER}</b></div>" +
			"<div>Audit Request Subject: <b>{REQUEST_SUBJECT}</b></div>" +		
			"<div>Audit Request Due Date: <b>{REQUEST_DUEDATE}</b></div>" +		
			"{POC}" +
			"{REQUEST_RELATEDAUDIT}<br/>" +
			"<div>Below are the listed action items that have been requested for the Audit: </div>" +
			"<div>{REQUEST_ACTIONITEMS}<br/></div>" +		
			"<div>Please provide responses for the following Sample(s): </div><br/>" +
			"<div>{RESPONSE_TITLES}</div>" ;
				

		emailText = emailText.replace("{REQUEST_NUMBER}", oRequest.number );
		emailText = emailText.replace("{REQUEST_SUBJECT}", oRequest.subject );
		emailText = emailText.replace("{REQUEST_DUEDATE}", oRequest.internalDueDate );
		emailText = emailText.replace("{REQUEST_ACTIONITEMS}", oRequest.actionItems );	

		if( poc == null || poc == "" )
		{
			emailText = emailText.replace("{POC}", "<br/>" );	
		}
		else
		{
			emailText = emailText.replace("{POC}", "<br/><b>POC: " + poc + "</b><br/>");	
		}
		
		if( responseTitles != null && responseTitles.length > 0 )
		{	
			function sortNumber(a, b) 
			{
				a = parseInt( a.sample, 10);
				b = parseInt( b.sample, 10 );
				
				return a - b;
			}
			responseTitles.sort(sortNumber);
			
			var responseTitleBody = "<ul>";
			for( var x = 0; x < responseTitles.length; x++ )
			{
				responseTitleBody += "<li>" + responseTitles[x].title + "</li>";
			}
			responseTitleBody += "</ul>";
			emailText = emailText.replace("{RESPONSE_TITLES}", responseTitleBody );	
		}
		else
		{
			emailText = emailText.replace("{RESPONSE_TITLES}", "" );	
		}
		
		if( oRequest.relatedAudit == null || oRequest.relatedAudit == "" )
			emailText = emailText.replace("{REQUEST_RELATEDAUDIT}", "<div>This is a new request, not similar to previous audit cycles.</div>");	
		else
			emailText = emailText.replace("{REQUEST_RELATEDAUDIT}", "<div>This request is similar to this previous cycle audit: " + oRequest.relatedAudit + "</div>");
		return emailText;
	}

	var m_emailCount = 0;
	function m_fnSendEmail( requestID )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		if( confirm("Are you sure you would like to notify all Action Offices listed in the Email Action Offices field?") )
		{
			m_bIsTransactionExecuting = true;

			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();
			
			oRequest = m_fnGetRequestByID( requestID );
			
			if( oRequest == null )
			{
				alert("Error occurred");
				return;
			}

			if( oRequest.status != "Open" && oRequest.status != "ReOpened" )
			{
				SP.UI.Notify.addNotification("This request is not Open.", false);
				return;
			}

			var responseCount = oRequest.responses.length;
			if( responseCount == 0 )
			{
				SP.UI.Notify.addNotification("There are no responses associated with this request.", false);
				return;
			}
			
			var arrEmailActionOffice = new Array();
			var emailActionOffices = oRequest.item.get_item('EmailActionOffice');
			for( var x = 0; x < emailActionOffices.length; x++ )
			{
				arrEmailActionOffice.push( emailActionOffices[x].get_lookupValue() );
			}	
			
			if( arrEmailActionOffice.length == 0 )
			{
				SP.UI.Notify.addNotification("Unable to send an email. 0 Action Offices listed in the Email Action Office field", false);
				return;
			}



			var arrEmails = new Array();
			
			for( var y = 0; y < responseCount; y++ )
			{
				var oResponse = oRequest.responses[y];
				if( oResponse.resStatus != "1-Open" && oResponse.resStatus != "3-Returned to Action Office" )
				{
					SP.UI.Notify.addNotification("Skipping Response (" + oResponse.title + "). It's not Open or Returned to Action Office", false);
					continue;
				}
				
				var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( oResponse.actionOffice );
				var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );

				if( actionOfficeGroupName == "" || actionOfficeGroupName == null || actionOfficeGroup == null )
				{
					SP.UI.Notify.addNotification("Unable to send an email. Action Office (" + oResponse.actionOffice + ") does not have a group associated with it", false);
					return;
				}
				
				//Iterate through the aos listed in the email action office field and if it matches this AO, then continue to create email for this AO
				var bAddThisAO = false;
				for( var x = 0; x < arrEmailActionOffice.length; x ++ )
				{
					if ( arrEmailActionOffice[x] == oResponse.actionOffice )
					{
						bAddThisAO = true;
						break;
					}
				}
				
				if( bAddThisAO ) //this means that this response's ao is in the email action offices field for this request and this ao should get a unique email with all the open responses
				{
				
					var ao = actionOfficeGroupName;
					if( oResponse.poc != null && oResponse.poc != "" ) //if poc field is provided, email the poc and poccc, not the Action office group
					{
						ao = oResponse.poc + ';' + oResponse.pocCC;
					}
				
					var bFound = false;
					for( var x = 0; x < arrEmails.length; x++ )
					{
						if( arrEmails[x].actionOffice == ao )
						{
							var oResSample = new Object();
							oResSample["sample"] = oResponse.sample;
							oResSample["title"] = oResponse.title;
							arrEmails[x].responseTitles.push( oResSample );
							bFound = true;
						}
					}
					
					if ( !bFound )
					{
						var emailObject = new Object();
						emailObject.actionOffice = ao;
						emailObject.poc = oResponse.poc;
						emailObject.responseTitles = new Array();
						
						var oResSample = new Object();
						oResSample["sample"] = oResponse.sample;
						oResSample["title"] = oResponse.title;
						
						emailObject.responseTitles.push( oResSample );
						arrEmails.push( emailObject );
					}	
				}
			}
			
			if( arrEmails.length == 0 )
			{
				SP.UI.Notify.addNotification("Unable to send an email. 0 Action Offices in the Email Action Office field match the Responses", false);
				return;
			}					

			m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Sending Emails", "Please wait... sending email notifications to Action Offices", 100, 400);

			document.body.style.cursor = 'wait';
			
			var emailList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleEmailHistory() );

			var emailListQuery = new SP.CamlQuery();	
			emailListQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID"/></OrderBy><Where><Eq><FieldRef Name="FSObjType"/><Value Type="Text">1</Value></Eq></Where></Query></View>');
			emailListFolderItems = emailList.getItems( emailListQuery );
			currCtx.load( emailListFolderItems, 'Include(ID, Title, DisplayName)');

			function OnSuccess(sender, args) 
		    {								
				m_emailCount = arrEmails.length;
				var cnt = 0;
				for( var y = 0; y < m_emailCount; y++ )
				{				
					var emailSubject = "Your Response Has Been Requested for Request Number: " + oRequest.number;
					var emailText = m_fnFormatEmailBodyToAO ( oRequest, arrEmails[y].responseTitles, arrEmails[y].poc  );				 		
					
					var itemCreateInfo = new SP.ListItemCreationInformation();
				    itemCreateInfo.set_folderUrl(location.protocol + "//" + location.host + Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameEmailHistory() + "/" + oRequest.number);				    
				    oListItem = emailList.addItem(itemCreateInfo);
				    oListItem.set_item('Title', emailSubject);
				    oListItem.set_item('Body', emailText);
				    oListItem.set_item('To', arrEmails[y].actionOffice );
				    oListItem.set_item('ReqNum', oRequest.number);
	  				oListItem.set_item('NotificationType', "AO Notification" );
				    oListItem.update();
					
		
					currCtx.executeQueryAsync
					(
						function () 
						{	
							cnt++;
							if( cnt == m_emailCount)
							{
								document.body.style.cursor = 'default';
																
								var requestList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleRequests() );
								oListItem = requestList.getItemById( requestID );
								oListItem.set_item("EmailSent", 1);			
								oListItem.update();
								
								currCtx.executeQueryAsync
								(
									function () 
									{	
										SP.UI.Notify.addNotification("Email Sent to Action Offices. ", false);
										setTimeout( function(){ m_fnRefresh() }, 1000 );					
									}, 
									function (sender, args) 
									{
										alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
										m_fnRefresh();
									}
								);							
							}
						}, 
						function (sender, args) 
						{
							document.body.style.cursor = 'default';
							
							alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
							m_fnRefresh();
						}
					);	
				}
		    }	
		    function OnFailure(sender, args) 
		    {      
				document.body.style.cursor = 'default';
		    	alert('Request failed. ' + args.get_message() + '\n' + args.get_stackTrace());
		    }
		    
			currCtx.executeQueryAsync(OnSuccess, OnFailure);
		}
	}
	
	//This gets executed when on refresh if a request does not have broken permissions. When a new request is created from the list form, we 
	//cant set the permissions until it's been created. So, on callback, refresh is called and checks for requests that don't have broken permissions
	function m_fnBreakRequestPermissions( oListItem, refreshPageOnUpdate, responseStatus, OnComplete)
	{
		if( !m_bIsSiteOwner )
		{
			return;
		}

		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web(); 
		
		this.currentUser = web.get_currentUser();
    	this.ownerGroup = web.get_associatedOwnerGroup();
	 	this.memberGroup = web.get_associatedMemberGroup();
	 	this.visitorGroup = web.get_associatedVisitorGroup();

		var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem,  Audit.Common.Utilities.GetGroupNameQA(), SP.PermissionKind.viewListItems);
		var special1HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem,  Audit.Common.Utilities.GetGroupNameSpecialPerm1(), SP.PermissionKind.viewListItems);
		var special2HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem,  Audit.Common.Utilities.GetGroupNameSpecialPerm2(), SP.PermissionKind.viewListItems);
		    
		oListItem.resetRoleInheritance();
		oListItem.breakRoleInheritance(false, false);
			
		var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollAdmin.add( web.get_roleDefinitions().getByType( SP.RoleType.administrator) );

		var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollContribute.add( web.get_roleDefinitions().getByType( SP.RoleType.contributor) );

	    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedRead.add( web.get_roleDefinitions().getByName( "Restricted Read" ));

	    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedContribute.add( web.get_roleDefinitions().getByName( "Restricted Contribute" ));

		//add site associated groups
		oListItem.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin );
		oListItem.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
		oListItem.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
										
		if( qaHasRead || responseStatus == "4-Approved for QA") //make sure qa gets read if it had access
		{
			var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );
			if( spGroupQA != null )					
				oListItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
		}

		if( special1HasRead ) //make sure qa gets read if it had access
		{
			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			if( group1SpecialPerm != null )					
				oListItem.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );
		}

		if( special2HasRead ) //make sure qa gets read if it had access
		{
			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );
			if( group2SpecialPerm != null )					
				oListItem.get_roleAssignments().add( group2SpecialPerm , roleDefBindingCollRestrictedRead );
		}

		oListItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();


		
		function onUpdateReqPermsSucceeed() 
		{		
			m_CntRequestAOsToAdd = 0;
			m_CntRequestAOsAdded = 0;

			//add action offices			
			var arrActionOffice = oListItem.get_item('ActionOffice');
			if( arrActionOffice != null && arrActionOffice.length > 0 )
			{
				for( var x = 0; x < arrActionOffice.length; x++ )
				{
					var actionOfficeName = arrActionOffice[x].get_lookupValue();
					
					var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
					var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
									
					if( actionOfficeGroup != null )
					{
						m_CntRequestAOsToAdd ++;
						
						var currCtx2 = new SP.ClientContext.get_current();
						var web2 = currCtx2.get_web(); 

					    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx2 );
						roleDefBindingCollRestrictedRead.add( web2.get_roleDefinitions().getByName( "Restricted Read" ));

						this.oListItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );	
						
						function onUpdatedReqAOSucceeded() 
						{
							m_CntRequestAOsAdded++;
							
							if( m_CntRequestAOsAdded == m_CntRequestAOsToAdd )
							{
								if( this.refreshPage )
									m_fnRefresh();
								else if( this.OnComplete )
									this.OnComplete( true );
							}						
						}
						function onUpdatedReqAOFailed(sender, args) 
						{		
							m_CntRequestAOsAdded++;
							
							if( m_CntRequestAOsAdded == m_CntRequestAOsToAdd )
							{
								if( this.refreshPage )
									m_fnRefresh();
								else if( this.OnComplete )
									this.OnComplete( true ); //return true to continue executing
							}						
						}
						
						var data = {refreshPage: this.refreshPage, OnComplete: this.OnComplete };
	    				currCtx2.executeQueryAsync(Function.createDelegate(data, onUpdatedReqAOSucceeded), Function.createDelegate(data, onUpdatedReqAOFailed));
					}
				}			
			}
			else
			{
				if( this.refreshPage )
				{
					setTimeout( function(){ m_fnRefresh() }, 500 );				
				}
				else if( this.OnComplete )
					this.OnComplete( true ); 
			}
		}
		
		function onUpdateReqPermsFailed(sender, args) 
		{		
			if( this.OnComplete )
			{
				this.OnComplete( true ); //continue execution
				SP.UI.Notify.addNotification("Failed to update permissions on Request: " + this.title + args.get_message() + "\n" + args.get_stackTrace() , false);
			}
			else if( this.refreshPage )
			{
				SP.UI.Notify.addNotification("Failed to update Request: " + this.title + args.get_message() + "\n" + args.get_stackTrace() , false);
				setTimeout( function(){ m_fnRefresh() }, 500 );
			}
			else
			{
				SP.UI.Notify.addNotification("Failed to update permissions on Request: " + this.title + args.get_message() + "\n" + args.get_stackTrace() , false);
			}
		}

		var data = {title: oListItem.get_item('Title'), refreshPage: refreshPageOnUpdate, oListItem: oListItem, OnComplete: OnComplete}
	    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdateReqPermsSucceeed), Function.createDelegate(data, onUpdateReqPermsFailed));
	}

	var m_cntAOToAddToEmailFolder = 0;
	var m_cntAOAddedToEmailFolder = 0;
	function m_fnBreakEmailFolderPermissions( oListItem, oRequestItem, refreshPageOnUpdate, OnComplete )
	{
		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web(); 
		
		this.currentUser = web.get_currentUser();
    	this.ownerGroup = web.get_associatedOwnerGroup();
	 	this.memberGroup = web.get_associatedMemberGroup();
	 	this.visitorGroup = web.get_associatedVisitorGroup();

		oListItem.resetRoleInheritance();
		oListItem.breakRoleInheritance(false, false);
			
		var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollAdmin.add( web.get_roleDefinitions().getByType( SP.RoleType.administrator) );

		var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollContribute.add( web.get_roleDefinitions().getByType( SP.RoleType.contributor) );

	    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedRead.add( web.get_roleDefinitions().getByName( "Restricted Read" ));

	    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedContribute.add( web.get_roleDefinitions().getByName( "Restricted Contribute" ));

		//add site associated groups
		oListItem.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin);
		oListItem.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
		oListItem.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
																		
		var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );
		if( spGroupQA != null )					
			oListItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedContribute);

		oListItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();
		
		function onUpdateEmailFolderPermsSucceeed() 
		{						
			if( this.oRequestItem )
			{
				//add action offices			
				var arrActionOffice = this.oRequestItem.get_item('ActionOffice');
				if( arrActionOffice != null && arrActionOffice.length > 0 )
				{
					for( var x = 0; x < arrActionOffice.length; x++ )
					{
						var actionOfficeName = arrActionOffice[x].get_lookupValue();
						
						var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
						var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
										
						if( actionOfficeGroup != null )
						{
							m_cntAOToAddToEmailFolder++;
							
							var currCtx2 = new SP.ClientContext.get_current();
							var web2 = currCtx.get_web(); 

						    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx2 );
							roleDefBindingCollRestrictedContribute.add( web2.get_roleDefinitions().getByName( "Restricted Contribute" ));
					
							this.oListItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedContribute);	
							
							function onAOAddedToEmailFolderSucceeded() 
							{
								m_cntAOAddedToEmailFolder++;
								
								if( m_cntAOAddedToEmailFolder == m_cntAOToAddToEmailFolder )
								{
									if( this.refreshPage )
										m_fnRefresh();
									else if( this.OnComplete )
										this.OnComplete( true );
								}						
							}
							function onAOAddedToEmailFolderFailed(sender, args) 
							{		
								m_cntAOAddedToEmailFolder++;
								
								if( m_cntAOAddedToEmailFolder == m_cntAOToAddToEmailFolder )
								{
									if( this.refreshPage )
										m_fnRefresh();
									else if( this.OnComplete )
										this.OnComplete( true ); //log and continue execution
								}						
							}
							
							var data = {refreshPage: this.refreshPage, OnComplete: this.OnComplete };
		    				currCtx2.executeQueryAsync(Function.createDelegate(data, onAOAddedToEmailFolderSucceeded), Function.createDelegate(data, onAOAddedToEmailFolderFailed));
    				
						}
					}			
				}
				else
				{
					if( this.refreshPage )
						m_fnRefresh();
					else if( this.OnComplete )
						this.OnComplete( true );
				}
			}
		}
		
		function onUpdateEmailFolderPermsFailed(sender, args) 
		{		
			if( this.refreshPage )
			{
				setTimeout( function(){ m_fnRefresh() }, 500 );
			}
			else if( this.OnComplete )
			{
				OnComplete( false );
			}
		}

		var data = {title: oListItem.get_item('Title'), refreshPage: refreshPageOnUpdate, oListItem: oListItem, oRequestItem: oRequestItem, OnComplete: OnComplete}
	    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdateEmailFolderPermsSucceeed), Function.createDelegate(data, onUpdateEmailFolderPermsFailed));
	}
	
	var m_countCSToAdd = 0;
	var m_countCSAdded = 0;
	
	var oCntCSAOAdd = new Object();
	
	function m_fnBreakCoversheetPermissions( oListItem, grantQARead, refreshPageOnUpdate, OnComplete )
	{	
		if( oListItem == null )
			return;
			
		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web(); 
		
		this.currentUser = currCtx.get_web().get_currentUser();
    	this.ownerGroup = web.get_associatedOwnerGroup();
	 	this.memberGroup = web.get_associatedMemberGroup();
	 	this.visitorGroup = web.get_associatedVisitorGroup();
		    		    
		var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem, Audit.Common.Utilities.GetGroupNameQA(), SP.PermissionKind.viewListItems);
		var special1HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem, Audit.Common.Utilities.GetGroupNameSpecialPerm1(), SP.PermissionKind.viewListItems);
		var special2HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem, Audit.Common.Utilities.GetGroupNameSpecialPerm2(), SP.PermissionKind.viewListItems);

		//check this because if it's inheriting, they'll have access
		if( !oListItem.get_hasUniqueRoleAssignments() )
		{
			qaHasRead = false;
			special1HasRead = false;
			special2HasRead = false;
		}

		oListItem.resetRoleInheritance();
		oListItem.breakRoleInheritance(false, false);
		
		var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollAdmin.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );

		var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollContribute.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor) );

	    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedRead.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Read"));

	    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedContribute.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Contribute"));

		//add associated site groups
		oListItem.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin);
		oListItem.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
		oListItem.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
		
		if( qaHasRead || grantQARead ) //make sure qa gets read if it had access
		{
			var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );
			if( spGroupQA != null )					
				oListItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
		}

		if( special1HasRead ) //make sure qa gets read if it had access
		{
			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			if( group1SpecialPerm!= null )					
				oListItem.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );
		}

		if( special2HasRead ) //make sure qa gets read if it had access
		{
			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );
			if( group2SpecialPerm != null )					
				oListItem.get_roleAssignments().add( group2SpecialPerm , roleDefBindingCollRestrictedRead );
		}
					
		oListItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();
		
		function onUpdatedCSSucceeded() 
		{	
			var currCtx2 = new SP.ClientContext.get_current();
					
			var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx2 );
			roleDefBindingCollRestrictedRead.add( currCtx2.get_web().get_roleDefinitions().getByName("Restricted Read"));

			//add action offices			
			var arrActionOffice = this.oListItem.get_item('ActionOffice');
			if( arrActionOffice == null || arrActionOffice.length == 0 )
			{
				if( this.refreshPage )
					m_fnRefresh();
				else if( this.OnComplete )
					this.OnComplete( true );
				return;
			}
						
			var csID = this.oListItem.get_item("ID");
			oCntCSAOAdd[ csID + "toAdd" ] = 0;
			oCntCSAOAdd[ csID + "added" ] = 0;
			
			for( var x = 0; x < arrActionOffice.length; x++ )
			{
				var actionOfficeName = arrActionOffice[x].get_lookupValue();
				var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
				var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
				if( actionOfficeGroup != null )
				{
					oCntCSAOAdd[ csID + "toAdd" ] = oCntCSAOAdd[ csID + "toAdd" ] + 1;

				    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx2 );
					roleDefBindingCollRestrictedRead.add( currCtx2.get_web().get_roleDefinitions().getByName("Restricted Read"));
					this.oListItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );
					
					function onUpdatedCSAOSucceeded() 
					{
						oCntCSAOAdd[ this.csID + "added" ] = oCntCSAOAdd[ this.csID + "added" ] + 1;
						
						if( oCntCSAOAdd[ this.csID + "added" ] == oCntCSAOAdd[ this.csID + "toAdd" ] )
						{
							if( this.refreshPage )
								m_fnRefresh();
							else if( this.OnComplete )
								this.OnComplete( true );
						}						
					}
					function onUpdatedCSAOFailed(sender, args) 
					{		
						oCntCSAOAdd[ this.csID + "added" ] = oCntCSAOAdd[ this.csID + "added" ] + 1;
						
						if( oCntCSAOAdd[ this.csID + "added" ] == oCntCSAOAdd[ this.csID + "toAdd" ] )
						{
							if( this.refreshPage )
								m_fnRefresh();
							else if( this.OnComplete )
								this.OnComplete( true );
						}						
					}
					
					var data = {refreshPage: this.refreshPage, OnComplete: this.OnComplete, csID: csID};
    				currCtx2.executeQueryAsync(Function.createDelegate(data, onUpdatedCSAOSucceeded), Function.createDelegate(data, onUpdatedCSAOFailed));
				}
			}
		}		
		
		function onUpdatedCSFailed(sender, args) 
		{
			SP.UI.Notify.addNotification("Failed to update permissions on Coversheet" + args.get_message() + "\n" + args.get_stackTrace(), false);
			
			if( this.refreshPage )
				m_fnRefresh();
			else if( this.OnComplete )
				this.OnComplete ( true ); //return true to continue executing
		}

		var data = {refreshPage: refreshPageOnUpdate, oListItem: oListItem, OnComplete: OnComplete};
	    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdatedCSSucceeded), Function.createDelegate(data, onUpdatedCSFailed));
	}
	
	function m_fnBreakCoversheetPermissionsOnSpecialPerms( currCtx, oListItem, addSpecialPerms, refreshPageOnUpdate, OnComplete)
	{	
		if( oListItem == null )
			return;
			
		var web = currCtx.get_web(); 
		
		this.currentUser = currCtx.get_web().get_currentUser();
    	this.ownerGroup = web.get_associatedOwnerGroup();
	 	this.memberGroup = web.get_associatedMemberGroup();
	 	this.visitorGroup = web.get_associatedVisitorGroup();
		    		    
		oListItem.resetRoleInheritance();
		oListItem.breakRoleInheritance(false, false);
		
		var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem,  Audit.Common.Utilities.GetGroupNameQA(), SP.PermissionKind.viewListItems);
			
		var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollAdmin.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );

		var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollContribute.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor) );

	    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedRead.add( currCtx.get_web().get_roleDefinitions().getByName( "Restricted Read" ));

	    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedContribute.add( currCtx.get_web().get_roleDefinitions().getByName( "Restricted Contribute" ));

		//add associated site groups
		oListItem.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin );
		oListItem.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
		oListItem.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
					
		if( qaHasRead ) //make sure qa gets read if it had access
		{
			var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );
			if( spGroupQA != null )					
				oListItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
		}

		if( addSpecialPerms ) //make sure qa gets read if it had access
		{
			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			if( group1SpecialPerm != null )					
				oListItem.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );

			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );
			if( group2SpecialPerm != null )					
				oListItem.get_roleAssignments().add( group2SpecialPerm, roleDefBindingCollRestrictedRead );
		}
					
		oListItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();

		function onUpdatedCSSPSucceeded() 
		{
			var currCtx2 = new SP.ClientContext.get_current();

			//add action offices			
			var arrActionOffice = this.oListItem.get_item('ActionOffice');
			
			if( arrActionOffice == null || arrActionOffice.length == 0 )
			{
				if( this.OnComplete )
					this.OnComplete( true );
				return;
			}
			
			var csID = this.oListItem.get_item("ID");
			oCntCSAOAdd[ csID + "toAdd" ] = 0;
			oCntCSAOAdd[ csID + "added" ] = 0;
			
			
			for( var x = 0; x < arrActionOffice.length; x++ )
			{
				var actionOfficeName = arrActionOffice[x].get_lookupValue();
				var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
				var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
				if( actionOfficeGroup != null )
				{
					oCntCSAOAdd[ csID + "toAdd" ] = oCntCSAOAdd[ csID + "toAdd" ] + 1;
					
				    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx2 );
					roleDefBindingCollRestrictedRead.add( currCtx2.get_web().get_roleDefinitions().getByName("Restricted Read") );					

					this.oListItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );
					
					function onUpdatedCSSPAOSucceeded() 
					{
						oCntCSAOAdd[ this.csID + "added" ] = oCntCSAOAdd[ this.csID + "added" ] + 1;
						
						if( oCntCSAOAdd[ this.csID + "added" ] == oCntCSAOAdd[ this.csID + "toAdd" ] )
						{
							if( this.OnComplete )
								this.OnComplete( true );
						}						
					}
					function onUpdatedCSSPAOFailed(sender, args) 
					{		
						oCntCSAOAdd[ this.csID + "added" ] = oCntCSAOAdd[ this.csID + "added" ] + 1;
						
						if( oCntCSAOAdd[ this.csID + "added" ] == oCntCSAOAdd[ this.csID + "toAdd" ]  )
						{
							if( this.OnComplete )
								this.OnComplete( true );
						}						
					}
					
					var data = {refreshPage: this.refreshPage, OnComplete: this.OnComplete, csID: csID };
    				currCtx2.executeQueryAsync(Function.createDelegate(data, onUpdatedCSSPAOSucceeded), Function.createDelegate(data, onUpdatedCSSPAOFailed));
				}			
			}
			
		}
		function onUpdatedCSSPFailed(sender, args) 
		{		
			if( this.OnComplete ) //return true to continue execution
				this.OnComplete( true );
		}

		var data = {oListItem: oListItem, OnComplete: OnComplete};
	    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdatedCSSPSucceeded), Function.createDelegate(data, onUpdatedCSSPFailed));
	}
	

	var m_AOsToAddToResponse = 0;
	var m_AOsAddedToResponse = 0;

	//This gets executed when on refresh if a response does not have broken permissions. When a new response is created from the list form, we 
	//cant set the permissions until it's been created. So, on callback, refresh is called and checks for responses that don't have broken permissions
	function m_fnBreakResponseAndFolderPermissions( requestStatus, oResponse, refreshPageOnUpdate, checkStatus, bForceGrantSP, bForceRemoveSP, OnComplete )
	{		
		if( !m_bIsSiteOwner )
		{
			OnComplete( true );
			return;
		}

		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web(); 
		
		this.currentUser = currCtx.get_web().get_currentUser();
    	this.ownerGroup = web.get_associatedOwnerGroup();
	 	this.memberGroup = web.get_associatedMemberGroup();
	 	this.visitorGroup = web.get_associatedVisitorGroup();
	
		var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oResponse.item,  Audit.Common.Utilities.GetGroupNameQA(), SP.PermissionKind.viewListItems);
		var special1HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oResponse.item,  Audit.Common.Utilities.GetGroupNameSpecialPerm1(), SP.PermissionKind.viewListItems);
		var special2HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oResponse.item,  Audit.Common.Utilities.GetGroupNameSpecialPerm2(), SP.PermissionKind.viewListItems);

		if( !oResponse.item.get_hasUniqueRoleAssignments() )
		{
			qaHasRead = false;
			special1HasRead = false;
			special2HasRead = false;
		}
		if( bForceGrantSP )
		{
			special1HasRead = true;
			special2HasRead = true;
		}
		else if( bForceRemoveSP )
		{
			special1HasRead = false;
			special2HasRead = false;
		}
		

		oResponse.item.resetRoleInheritance();
		oResponse.item.breakRoleInheritance(false, false);
		
		if( oResponse.responseFolderItem )
		{
			oResponse.responseFolderItem.resetRoleInheritance();
			oResponse.responseFolderItem.breakRoleInheritance(false, false);
		}
			
		var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollAdmin.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );

		var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollContribute.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor) );

	    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedRead.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Read"));

	    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedContribute.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Contribute"));


		//add associated site groups
		oResponse.item.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin);
		oResponse.item.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
		oResponse.item.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
		
		if( oResponse.responseFolderItem )
		{
			//add associated site groups
			oResponse.responseFolderItem.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin);
			oResponse.responseFolderItem.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
			oResponse.responseFolderItem.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
		}
				
		if( qaHasRead || oResponse.item.get_item("ResStatus") == "4-Approved for QA" || oResponse.item.get_item("ResStatus") == "6-Reposted After Rejection") //make sure qa gets read if it had access
		{
			var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );	
			if( spGroupQA != null )
			{	
				if( checkStatus && (oResponse.item.get_item("ResStatus") == "4-Approved for QA" || oResponse.item.get_item("ResStatus") == "6-Reposted After Rejection")  && ( requestStatus == "Open" || requestStatus == "ReOpened"))	
				{			
					oResponse.item.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedContribute);
					if( oResponse.responseFolderItem )
					{
						oResponse.responseFolderItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedContribute);
					}
				}
				else
				{
					oResponse.item.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
					if( oResponse.responseFolderItem )
					{
						oResponse.responseFolderItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
					}
				}
			}
		}
		
		if( special1HasRead && ( oResponse.item.get_item("ResStatus") == "4-Approved for QA" || oResponse.item.get_item("ResStatus") == "6-Reposted After Rejection" || oResponse.item.get_item("ResStatus") == "7-Closed" ))
		{
			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			if( group1SpecialPerm != null )
			{					
				oResponse.item.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );
				if( oResponse.responseFolderItem )
				{
					oResponse.responseFolderItem.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );
				}
			}
		}

		if( special2HasRead && ( oResponse.item.get_item("ResStatus") == "4-Approved for QA" || oResponse.item.get_item("ResStatus") == "6-Reposted After Rejection" || oResponse.item.get_item("ResStatus") == "7-Closed" ))
		{
			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );
			if( group2SpecialPerm != null )
			{
				oResponse.item.get_roleAssignments().add( group2SpecialPerm , roleDefBindingCollRestrictedRead );
				if( oResponse.responseFolderItem )
				{
					oResponse.responseFolderItem.get_roleAssignments().add( group2SpecialPerm , roleDefBindingCollRestrictedRead );
				}
			}
		}
		
		//add action offices			
		var actionOffice = oResponse.item.get_item('ActionOffice');
		if( actionOffice != null )
		{
			var actionOfficeName = actionOffice.get_lookupValue();
			var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
			var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
			
			if( actionOfficeGroup != null )
			{
				if( checkStatus && (oResponse.item.get_item('ResStatus') == "1-Open" || oResponse.item.get_item('ResStatus') == "3-Returned to Action Office") && ( requestStatus == "Open" || requestStatus == "ReOpened") )
				{
					oResponse.item.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedContribute);	
					if( oResponse.responseFolderItem )
						oResponse.responseFolderItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedContribute);	
				}
				else
				{
					oResponse.item.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );
					if( oResponse.responseFolderItem )
					{
						oResponse.responseFolderItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );	
					}				
				}
			}
		}

		oResponse.item.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();
		if( oResponse.responseFolderItem )
			oResponse.responseFolderItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();


		function onUpdateResponsePermsSucceeed() 
		{
			if( this.refreshPage )
				m_fnRefresh();
			else if( this.OnComplete )
				this.OnComplete( true );
		}
		
		function onUpdateResponsePermsFailed(sender, args) 
		{
			if( this.refreshPage )
			{
				SP.UI.Notify.addNotification("Failed to update permissions on Response: " + this.title + args.get_message() + "\n" + args.get_stackTrace() , false);
				m_fnRefresh();
			}
			else if( this.OnComplete )
				this.OnComplete( false );
		}

		var data = {title: oResponse.item.get_item('Title'), refreshPage: refreshPageOnUpdate, OnComplete: OnComplete}
	    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdateResponsePermsSucceeed), Function.createDelegate(data, onUpdateResponsePermsFailed));
	}


	//This gets executed when on refresh if a response does not have broken permissions. When a new response is created from the list form, we 
	//cant set the permissions until it's been created. So, on callback, refresh is called and checks for responses that don't have broken permissions
	function m_fnBreakResponsePermissions( oListItem, refreshPageOnUpdate, checkStatus )
	{		
		if( !m_bIsSiteOwner )
		{
			return;
		}

		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web(); 
		
		this.currentUser = currCtx.get_web().get_currentUser();
    	this.ownerGroup = web.get_associatedOwnerGroup();
	 	this.memberGroup = web.get_associatedMemberGroup();
	 	this.visitorGroup = web.get_associatedVisitorGroup();
	
		//check QA before resetting	
		var permissionsToCheck = SP.PermissionKind.viewListItems;
		var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem,  Audit.Common.Utilities.GetGroupNameQA() , permissionsToCheck );
		var special1HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem,  Audit.Common.Utilities.GetGroupNameSpecialPerm1(), SP.PermissionKind.viewListItems);
		var special2HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItem,  Audit.Common.Utilities.GetGroupNameSpecialPerm2(), SP.PermissionKind.viewListItems);

		if( !oListItem.get_hasUniqueRoleAssignments() )
		{
			qaHasRead = false;
			special1HasRead = false;
			special2HasRead = false;
		}

		oListItem.resetRoleInheritance();
		oListItem.breakRoleInheritance(false, false);
			
		var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollAdmin.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );

		var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollContribute.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor) );

	    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedRead.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Read"));

	    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedContribute.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Contribute"));


		//add associated site groups
		oListItem.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin);
		oListItem.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
		oListItem.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
			
		//add action offices			
		var actionOffice = oListItem.get_item('ActionOffice');
		if( actionOffice != null )
		{
			var actionOfficeName = actionOffice.get_lookupValue();
			var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
			var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
			
			if( actionOfficeGroup != null )
			{
				if( checkStatus && (oListItem.get_item('ResStatus') == "1-Open" || oListItem.get_item('ResStatus') == "3-Returned to Action Office") )
					oListItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedContribute);				
				else
					oListItem.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );				
			}
			
		}
		
		if( qaHasRead || oListItem.get_item("ResStatus") == "4-Approved for QA" || oListItem.get_item("ResStatus") == "6-Reposted After Rejection") //make sure qa gets read if it had access
		{
			var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );	
			if( spGroupQA != null )
			{	
				if( (oListItem.get_item("ResStatus") == "4-Approved for QA" || oListItem.get_item("ResStatus") == "6-Reposted After Rejection")  && checkStatus )				
					oListItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedContribute);
				else
					oListItem.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
			}
		}
		
		if( special1HasRead && ( oListItem.get_item("ResStatus") == "4-Approved for QA" || oListItem.get_item("ResStatus") == "6-Reposted After Rejection" || oListItem.get_item("ResStatus") == "7-Closed" ))
		{
			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			if( group1SpecialPerm != null )					
				oListItem.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );
		}

		if( special2HasRead && ( oListItem.get_item("ResStatus") == "4-Approved for QA" || oListItem.get_item("ResStatus") == "6-Reposted After Rejection" || oListItem.get_item("ResStatus") == "7-Closed" ))
		{
			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );
			if( group2SpecialPerm != null )					
				oListItem.get_roleAssignments().add( group2SpecialPerm , roleDefBindingCollRestrictedRead );
		}
											
		oListItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();

		var data = {title: oListItem.get_item('Title'), refreshPage: refreshPageOnUpdate, item: oListItem}
		function onUpdateResponsePermsSucceeed() 
		{
			if( this.refreshPage )
			{
				SP.UI.Notify.addNotification("Updated permissions on Response: " + this.title, false);
				m_fnRefresh();				
			}
		}
		
		function onUpdateResponsePermsFailed(sender, args) 
		{
			if( this.refreshPage )
			{
				SP.UI.Notify.addNotification("Failed to update permissions on Response: " + this.title + args.get_message() + "\n" + args.get_stackTrace() , false);
				m_fnRefresh();
			}
		}

	    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdateResponsePermsSucceeed), Function.createDelegate(data, onUpdateResponsePermsFailed));
	}
	
	function m_fnBreakResponseFolderPermissions(oListItemFolder, oListItemResponse, refreshPageOnUpdate, bCheckStatus, OnComplete)
	{
		if( !m_bIsSiteOwner )
		{
			OnComplete( true );
			return;
		}

		var currCtx = new SP.ClientContext.get_current();
		var web = currCtx.get_web(); 
		
		this.currentUser = currCtx.get_web().get_currentUser();
    	this.ownerGroup = web.get_associatedOwnerGroup();
	 	this.memberGroup = web.get_associatedMemberGroup();
	 	this.visitorGroup = web.get_associatedVisitorGroup();
	 	
	 	var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItemFolder,  Audit.Common.Utilities.GetGroupNameQA(), SP.PermissionKind.viewListItems);
		var special1HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItemFolder,  Audit.Common.Utilities.GetGroupNameSpecialPerm1(), SP.PermissionKind.viewListItems);
		var special2HasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oListItemFolder,  Audit.Common.Utilities.GetGroupNameSpecialPerm2(), SP.PermissionKind.viewListItems);
		
		if( !oListItemFolder.get_hasUniqueRoleAssignments() )
		{
			qaHasRead = false;
			special1HasRead = false;
			special2HasRead = false;
		}
  		    		    
		oListItemFolder.resetRoleInheritance();
		oListItemFolder.breakRoleInheritance(false, false);
			
		var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollAdmin.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );

		var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollContribute.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor) );

	    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedRead.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Read"));

	    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
		roleDefBindingCollRestrictedContribute.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Contribute"));


		//add associated site groups
		oListItemFolder.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin);
		oListItemFolder.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
		oListItemFolder.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );
			
		//add action offices			
		var actionOffice = oListItemResponse.get_item('ActionOffice');
		if( actionOffice != null )
		{
			var actionOfficeName = actionOffice.get_lookupValue();
			var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
			var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
			
			if( actionOfficeGroup != null )
			{
				if( bCheckStatus && ( oListItemResponse.get_item('ResStatus') == "1-Open" || oListItemResponse.get_item('ResStatus') == "3-Returned to Action Office") )
					oListItemFolder.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedContribute);				
				else
					oListItemFolder.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );				
			}
		}
		
		if( qaHasRead || oListItemResponse.get_item("ResStatus") == "4-Approved for QA" || oListItemResponse.get_item("ResStatus") == "6-Reposted After Rejection" ) //make sure qa gets read if it had access
		{
			var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );	
			if( spGroupQA != null )
			{	
				if( bCheckStatus && ( oListItemResponse.get_item("ResStatus") == "4-Approved for QA" || oListItemResponse.get_item("ResStatus") == "6-Reposted After Rejection") )				
					oListItemFolder.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedContribute);
				else
					oListItemFolder.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
			}
		}
		
		if( special1HasRead && ( oListItemResponse.get_item("ResStatus") == "4-Approved for QA" || oListItemResponse.get_item("ResStatus") == "6-Reposted After Rejection" || oListItemResponse.get_item("ResStatus") == "7-Closed" ))
		{
			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			if( group1SpecialPerm != null )					
				oListItemFolder.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );
		}

		if( special2HasRead && ( oListItemResponse.get_item("ResStatus") == "4-Approved for QA" || oListItemResponse.get_item("ResStatus") == "6-Reposted After Rejection" || oListItemResponse.get_item("ResStatus") == "7-Closed" ))
		{
			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );
			if( group2SpecialPerm != null )					
				oListItemFolder.get_roleAssignments().add( group2SpecialPerm, roleDefBindingCollRestrictedRead );
		}

											
		oListItemFolder.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();
		
		var data = {title: oListItemResponse.get_item('Title'), refreshPage: refreshPageOnUpdate, OnComplete: OnComplete}
		function onUpdateResponseFolderPermsSucceeed() 
		{						
			if( this.refreshPage )
			{
				SP.UI.Notify.addNotification("Updated permissions on Response Folder: " + this.title, false);
				setTimeout( function(){ m_fnRefresh()}, 200 );
			}
			else if( this.OnComplete )
				this.OnComplete( true );
		}
		
		function onUpdateResponseFolderPermsFailed(sender, args) 
		{			
			if( this.refreshPage )
			{
				SP.UI.Notify.addNotification("Failed to update permissions on Response Folder: " + this.title + args.get_message() + "\n" + args.get_stackTrace() , false);
				setTimeout( function(){ m_fnRefresh()}, 200 );
			}
			else if (this.OnComplete)
			{
				this.OnComplete( true );
			}
		}

	    currCtx.executeQueryAsync(Function.createDelegate(data, onUpdateResponseFolderPermsSucceeed), Function.createDelegate(data, onUpdateResponseFolderPermsFailed));
	}

	var	m_countAOSPToAdd = 0;
	var m_countAOSPAdded = 0;
	function m_fnGrantAOSpecialPermsOnRequest ( oRequest, OnComplete )
	{
		if( oRequest == null )
		{
			if( OnComplete )
				OnComplete ( true );
			return;
		}

		m_countAOSPToAdd = 0;
		m_countAOSPAdded = 0;
		
		//add action offices to request
		var arrActionOffice = oRequest.item.get_item('ActionOffice');
		
		if( arrActionOffice == null || arrActionOffice.length == 0 )
		{
			if( this.OnComplete )
				this.OnComplete( true );

			return;
		}
		
		for( var x = 0; x < arrActionOffice.length; x++ )
		{
			var actionOfficeName = arrActionOffice[x].get_lookupValue();
			var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( actionOfficeName );
			var actionOfficeGroup = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
			
			if( actionOfficeGroup != null )
			{
				m_countAOSPToAdd++;

				var currCtx2 = new SP.ClientContext.get_current();
				var web = currCtx2.get_web(); 

			    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx2 );
				roleDefBindingCollRestrictedRead.add( currCtx2.get_web().get_roleDefinitions().getByName("Restricted Read"));
				
				oRequest.item.get_roleAssignments().add( actionOfficeGroup, roleDefBindingCollRestrictedRead );
				
				function onGrantAOSpecialPermsSucceeded() 
				{
					m_countAOSPAdded++;
					
					$("#divGrantCntr").text("Ensured " + m_countAOSPAdded + " of " + m_countAOSPToAdd + " Action Offices have permissions to Request");
					if( m_countAOSPAdded == m_countAOSPToAdd )
					{
						if( this.OnComplete )
							this.OnComplete( true );
					}						
				}
				function onGrantAOSpecialPermsFailed(sender, args) 
				{		
					m_countAOSPAdded++;
					
					$("#divGrantCntr").text("Ensured " + m_countAOSPAdded + " of " + m_countAOSPToAdd + " Action Offices have permissions to Request");
					if( m_countAOSPAdded == m_countAOSPToAdd )
					{
						if( this.OnComplete )
							this.OnComplete( true );
					}						
				}
				
				var data = { OnComplete: OnComplete };
   				currCtx2.executeQueryAsync(Function.createDelegate(data, onGrantAOSpecialPermsSucceeded), Function.createDelegate(data, onGrantAOSpecialPermsFailed));
			}
		}
	}
	
	function m_fnGrantSpecialPermsOnCS( oRequest, currCtx, addSpecialPerms, OnComplete )
	{
		m_countCSToAdd = 0;
		m_countCSAdded = 0;

		if( oRequest == null || oRequest.coversheets == null || oRequest.coversheets.length == 0 )
		{
			if( OnComplete )
				OnComplete( true );
			return;
		}
			
		oCntCSAOAdd = new Object();
		
		//Update coversheets to give special permissions access
		for( var x = 0; x < oRequest.coversheets.length; x++ )
		{
			var coversheetItem = oRequest.coversheets[x].item;
			if( coversheetItem )
			{
				m_countCSToAdd++;
				
				var bDoneBreakingCSPermsOnSpecialPerms = false;
				m_fnBreakCoversheetPermissionsOnSpecialPerms( currCtx, coversheetItem, addSpecialPerms, false, function( bDoneBreakingCSPermsOnSpecialPerms )
				{
					if( bDoneBreakingCSPermsOnSpecialPerms )
					{
						m_countCSAdded++;
						$("#divGrantCntr").text("Updated " + m_countCSAdded + " of " + m_countCSToAdd + " Coversheet permissions");
					}
					else
					{
						m_countCSAdded++; //log here, but continue executing
						$("#divGrantCntr").text("Updated " + m_countCSAdded + " of " + m_countCSToAdd + " Coversheet permissions");
					}
					
					if( m_countCSAdded == m_countCSToAdd )
					{
						if( OnComplete )
							OnComplete( true );
					}
				});
			}
		}
	}
	
	var	m_countSPResFolderToAdd = 0;
	var m_countSPResFolderAdded = 0;
	function m_fnGrantSpecialPermsOnResponseAndFolder( oRequest, addSpecialPerms, OnComplete )
	{
		if( oRequest == null || oRequest.responses == null || oRequest.responses.length == 0 )
		{
			if( OnComplete )
				OnComplete( true );
				
			return;
		}

		for( var y = 0; y < oRequest.responses.length; y++ )
		{
			var oResponse = oRequest.responses[y];
			if( oResponse.resStatus == "4-Approved for QA" || oResponse.resStatus == "6-Reposted After Rejection" || oResponse.resStatus == "7-Closed" )
			{	
				m_countSPResFolderToAdd++;
				
				var bBrokeResponseAndFolderPermissions = false;
				
				var bForceAdd = false;
				var bForceRemove = false;
				if( addSpecialPerms )
					bForceAdd = true;
				else
					bForceRemove = true;
					
				m_fnBreakResponseAndFolderPermissions( oRequest.status, oResponse, false, true, bForceAdd, bForceRemove, function ( bBrokeResponseAndFolderPermissions )
				{
					if( bBrokeResponseAndFolderPermissions )
					{
						m_countSPResFolderAdded++;
					}
					else if( bBrokeResponseAndFolderPermissions )
					{
						m_countSPResFolderAdded++; //log here, but continue executing
					}

					$("#divGrantCntr").text("Updated " + m_countSPResFolderAdded + " of " + m_countSPResFolderToAdd + " Response permissions");
					
					if( m_countSPResFolderAdded == m_countSPResFolderToAdd )
					{
						if( OnComplete )
							OnComplete( true );
					}
				});
			}
		}
	}
	
	function m_fnGrantSpecialPermissions( requestNumber )
	{
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		//this can be stale... 
		var oRequest = m_fnGetRequestByNumber( requestNumber );
		if( oRequest == null )
			return;
		
		m_bIsTransactionExecuting = true;
	
		var cntGranted = 0;
		var cntToGrant = 0;
		var responseCount = oRequest.responses.length;
		for( var y = 0; y < responseCount; y++ )
		{
			var oResponse = oRequest.responses[y];
			
			if( oResponse.resStatus == "4-Approved for QA" || oResponse.resStatus == "6-Reposted After Rejection" || oResponse.resStatus == "7-Closed" )
			{
				cntToGrant++;
			}
		}
				
		if( confirm("Are you sure you would like to grant special permissions on this Request and to (" + cntToGrant + ") Responses?"))
		{			
			m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Information", "Please wait... granting Special Permissions to Request and Responses <div id='divGrantCntr'></div>", 200, 600)
			
			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );
				
			var currCtx = SP.ClientContext.get_current();  	
		    var web = currCtx.get_web(); 
			this.currentUser = web.get_currentUser();
	    	this.ownerGroup = web.get_associatedOwnerGroup();
		 	this.memberGroup = web.get_associatedMemberGroup();
		 	this.visitorGroup = web.get_associatedVisitorGroup();
		    		
			var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oRequest.item,  Audit.Common.Utilities.GetGroupNameQA(), SP.PermissionKind.viewListItems);
    
    		///////////////////////////////////////////////////////////////////////////////////////////////////////////
			//Update permissions to Request. everyone should get restricted read except for the associated member groups
			oRequest.item.resetRoleInheritance();
			oRequest.item.breakRoleInheritance(false, false);
			
			var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollAdmin.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );

			var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollContribute.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor ) );

		    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollRestrictedRead.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Read"));

		    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollRestrictedContribute.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Contribute"));

			//add associated site groups to request
			oRequest.item.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin );	
			oRequest.item.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
			oRequest.item.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );

			//add special permissions to request
			if( group1SpecialPerm != null )
				oRequest.item.get_roleAssignments().add( group1SpecialPerm, roleDefBindingCollRestrictedRead );
			if( group2SpecialPerm!= null )
				oRequest.item.get_roleAssignments().add( group2SpecialPerm, roleDefBindingCollRestrictedRead );			
	
			//make sure qa gets read on request if it previously had access
			if( qaHasRead )
			{
				var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );						
				if( spGroupQA != null )
					oRequest.item.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
			}
			
			oRequest.item.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();

			//on success, the request permissions will be updated, but now we have to update the ao permissions on the request one by one
			//do this to avoid resource exceeded error
			function onUpdated1() 
			{
				var bDoneGrantingAOSpecialPerms = false;
				m_fnGrantAOSpecialPermsOnRequest( oRequest, function( bDoneGrantingAOSpecialPerms )
				{
					if( bDoneGrantingAOSpecialPerms )
					{						
						var bDoneGrantingCSSpecialPerms = false;						
						m_fnGrantSpecialPermsOnCS( oRequest, currCtx, true, function( bDoneGrantingCSSpecialPerms )
						{
							if( bDoneGrantingCSSpecialPerms )
							{
							
								var responseCount = oRequest.responses.length;
								
								if( responseCount == 0 || cntToGrant == 0)
								{
									currCtx.executeQueryAsync
									(
										function () 
										{	
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Completed granting Special Permissions", false);
											setTimeout( function(){ m_fnRefresh(); }, 200 );
										}, 
										function (sender, args) 
										{
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Request failed1: "  + args.get_message() + "\n" + args.get_stackTrace(), false)							
											setTimeout( function(){ m_fnRefresh(); }, 200 );
										}
									);
									return;	 	
								}
								else
								{
									//Update permissions responses - everyone should get restricted read, except for the associated member groups. action offices get contribute if open or returned to action office
									var bDoneGrantingSpecialPermsOnResponsesAndFolders = false;
									m_fnGrantSpecialPermsOnResponseAndFolder( oRequest, true, function( bDoneGrantingSpecialPermsOnResponsesAndFolders )
									{
										if( bDoneGrantingSpecialPermsOnResponsesAndFolders )
										{
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Completed granting Special Permissions", false);
											setTimeout( function(){ m_fnRefresh()}, 200 );
										}
										else
										{
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Unable to update all responses and folders", false)							
											setTimeout( function(){ m_fnRefresh()}, 200 );
										}
									});
								}
							}
						});
					}
				});
			}
			function onFailed1(sender, args) 
			{		
				
			}
			
			var data = {oRequest: oRequest };
			currCtx.executeQueryAsync(Function.createDelegate(data, onUpdated1), Function.createDelegate(data, onFailed1));
		}
		else
			m_bIsTransactionExecuting = false;
	}	

	function m_fnRemoveSpecialPermissions( id )
	{		
		if( !m_bIsSiteOwner )
		{
			SP.UI.Notify.addNotification("You do not have access to perform this action...", false);
			return;
		}

		//this can be stale... 
		var oRequest = m_fnGetRequestByNumber( id );
		if( oRequest == null )
			return;
			
		m_bIsTransactionExecuting = true;
		
		var cntRemoved = 0;
		var cntToRemove = 0;
		var responseCount = oRequest.responses.length;
		for( var y = 0; y < responseCount; y++ )
		{
			var oResponse = oRequest.responses[y];
			
			if( oResponse.resStatus == "4-Approved for QA" || oResponse.resStatus == "6-Reposted After Rejection" || oResponse.resStatus == "7-Closed" )
			{
				cntToRemove ++;
			}
		}

		if( confirm("Are you sure you would like to remove special permissions on this Request and on (" + cntToRemove + ") Responses?"))
		{
			m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Information", "Please wait... removing Special Permissions on Request and Responses <div id='divGrantCntr'></div>", 200, 600)

			var currCtx = SP.ClientContext.get_current();  	
		    var web = currCtx.get_web(); 
		    
			this.currentUser = web.get_currentUser();
	    	this.ownerGroup = web.get_associatedOwnerGroup();
		 	this.memberGroup = web.get_associatedMemberGroup();
		 	this.visitorGroup = web.get_associatedVisitorGroup();
			
			var qaHasRead = Audit.Common.Utilities.CheckSPItemHasGroupPermission(oRequest.item,  Audit.Common.Utilities.GetGroupNameQA(), SP.PermissionKind.viewListItems);

			var group1SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm1() );
			var group2SpecialPerm = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameSpecialPerm2() );

			oRequest.item.resetRoleInheritance();
			oRequest.item.breakRoleInheritance(false, false);
			
			var roleDefBindingCollAdmin = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollAdmin.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );

			var roleDefBindingCollContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollContribute.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor) );

		    var roleDefBindingCollRestrictedRead = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollRestrictedRead.add( currCtx.get_web().get_roleDefinitions().getByName( "Restricted Read" ));

		    var roleDefBindingCollRestrictedContribute = SP.RoleDefinitionBindingCollection.newObject( currCtx );
			roleDefBindingCollRestrictedContribute.add( currCtx.get_web().get_roleDefinitions().getByName("Restricted Contribute"));

			//add site groups
			oRequest.item.get_roleAssignments().add( ownerGroup, roleDefBindingCollAdmin );
			oRequest.item.get_roleAssignments().add( memberGroup, roleDefBindingCollContribute );
			oRequest.item.get_roleAssignments().add( visitorGroup, roleDefBindingCollRestrictedRead );

			if( qaHasRead ) //make sure qa gets read if it had access
			{
				var spGroupQA = Audit.Common.Utilities.GetSPSiteGroup( Audit.Common.Utilities.GetGroupNameQA() );
				if( spGroupQA != null )						
					oRequest.item.get_roleAssignments().add( spGroupQA, roleDefBindingCollRestrictedRead );
			}
			oRequest.item.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();
			
			//on success, the request permissions will be updated, but now we have to update the ao permissions on the request one by one
			//do this to avoid resource exceeded error
			function onUpdated1() 
			{
				var bDoneGrantingAOSpecialPerms = false;
				m_fnGrantAOSpecialPermsOnRequest( oRequest, function( bDoneGrantingAOSpecialPerms )
				{
					if( bDoneGrantingAOSpecialPerms )
					{						
						var bDoneGrantingCSSpecialPerms = false;						
						m_fnGrantSpecialPermsOnCS( oRequest, currCtx, false, function( bDoneGrantingCSSpecialPerms )
						{
							if( bDoneGrantingCSSpecialPerms )
							{
							
								var responseCount = oRequest.responses.length;
								
								if( responseCount == 0 || cntToRemove == 0)
								{
									currCtx.executeQueryAsync
									(
										function () 
										{	
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Completed removing Special Permissions", false);
											setTimeout( function(){ m_fnRefresh()}, 200 );
										}, 
										function (sender, args) 
										{
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Request failed1: "  + args.get_message() + "\n" + args.get_stackTrace(), false)							
											setTimeout( function(){ m_fnRefresh()}, 200 );
										}
									);
									return;	 	
								}
								else
								{
									//Update permissions responses - everyone should get restricted read, except for the associated member groups. action offices get contribute if open or returned to action office
									var bDoneGrantingSpecialPermsOnResponsesAndFolders = false;
									m_fnGrantSpecialPermsOnResponseAndFolder( oRequest, false, function( bDoneGrantingSpecialPermsOnResponsesAndFolders )
									{
										if( bDoneGrantingSpecialPermsOnResponsesAndFolders )
										{
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Completed removing Special Permissions", false);
											setTimeout( function(){ m_fnRefresh()}, 200 );
										}
										else
										{
											document.body.style.cursor = 'default';
											
											notifyId = SP.UI.Notify.addNotification("Unable to update all responses and folders", false)							
											setTimeout( function(){ m_fnRefresh()}, 200 );
										}
									});
								}
							}
						});
					}
				});
			}
			function onFailed1(sender, args) 
			{		
				
			}
			
			var data = {oRequest: oRequest };
			currCtx.executeQueryAsync(Function.createDelegate(data, onUpdated1), Function.createDelegate(data, onFailed1));
		}
		else
			m_bIsTransactionExecuting = false;
	}
	
	function GetSourceUrlForForms()
	{
		var curPath = location.pathname;
		
		var tabIndex = $("#tabs").tabs('option', 'active');
		curPath += "?Tab=" + tabIndex;

		var requestNum = $("#ddlReqNum").val();
		if( requestNum != "" )
			curPath += "%26RequestNum=" + requestNum;
		
		var source = "&Source=" + curPath;
		return source;
	}

	function OnCallbackFormRefreshPage( result, value)
	{
		m_fnRefresh();
	}


	function OnCallbackForm(result, value)
	{
		if (result === SP.UI.DialogResult.OK) 
		{
			//alert( value );
			m_fnRefresh();
		}
		else
			m_bIsTransactionExecuting = false;
	}
	
	function OnCallbackFormNewRequest(result, value)
	{
		if (result === SP.UI.DialogResult.OK) 
		{
			m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Information", "Please wait... Updating Request Permissions", 200, 400);

			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var requestList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleRequests() );
			var requestQuery = new SP.CamlQuery();	
			requestQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID" Ascending="FALSE"/></OrderBy></Query><RowLimit>1</RowLimit></View>');
			requestItems = requestList.getItems( requestQuery );
			//request status has internal name as response status in the request list
			currCtx.load( requestItems, 'Include(ID, Title, ActionOffice, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');

			emailList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleEmailHistory() );
			var emailListQuery = new SP.CamlQuery();	
			emailListQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID"/></OrderBy><Where><Eq><FieldRef Name="FSObjType"/><Value Type="Text">1</Value></Eq></Where></Query></View>');
			emailListFolderItems = emailList.getItems( emailListQuery );
			currCtx.load( emailListFolderItems, 'Include(ID, Title, DisplayName)');
			
			currCtx.executeQueryAsync
			(
				function () 
				{	
					var oListItem = null;
					
					var listItemEnumerator = requestItems.getEnumerator();
					while(listItemEnumerator.moveNext())
					{
						oListItem = listItemEnumerator.get_current();
						break;
					}
					
					if( oListItem )
					{
						if( !oListItem.get_hasUniqueRoleAssignments() )
						{
							var bDoneBreakingReqPermisions = false;
							m_fnBreakRequestPermissions( oListItem, false, null, function( bDoneBreakingReqPermisions )
							{			
								var bDoneCreatingEmailFolder = false;					
								Audit.Common.Utilities.CreateEmailFolder( emailList, oListItem.get_item("Title"), oListItem, function( bDoneCreatingEmailFolder )
								{
									$("#tabs").tabs("option", "active", 2);
									m_fnRefresh( oListItem.get_item("Title") );
								});
							});
						}
						else
						{
							var bDoneCreatingEmailFolder = false;					
							Audit.Common.Utilities.CreateEmailFolder( emailList, oListItem.get_item("Title"), oListItem, function( bDoneCreatingEmailFolder )
							{
								$("#tabs").tabs("option", "active", 2);
								m_fnRefresh( oListItem.get_item("Title") );
							});
						}
					}
				}, 
				function (sender, args) 
				{
					//alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
					m_fnRefresh();
				}
			);

		}
	}

	function m_fnUpdateAllResponsePermissions( requestStatus, requestNum, bCheckStatus, OnCompleteUpdateResponsePerms )
	{
		var cntResponsesToBreak = 0;
		var cntResponsesBroken = 0;
		//for( var y = 0; y < m_arrRequests.length; y++ )
		//{
		//	if( m_arrRequests[y].number == requestNum )
		//	{
		var oRequestBigMap = m_bigMap["request-" + requestNum];
		if( oRequestBigMap )
		{
			for( var z = 0; z < oRequestBigMap.responses.length; z++ )
			{
				cntResponsesToBreak++;					
				var doneBreakingResponse = false;
				m_fnBreakResponseAndFolderPermissions(requestStatus, oRequestBigMap.responses[z], false, bCheckStatus, false, false, function( doneBreakingResponse )
				{
					if( doneBreakingResponse )
					{
						cntResponsesBroken++;
						$("#divMsgEditRequest").text("Updated " + cntResponsesBroken + " of " + cntResponsesToBreak + " Response permissions");
						if( cntResponsesBroken == cntResponsesToBreak )
						{
							OnCompleteUpdateResponsePerms ( true ); 
						}
					}
					else
					{
						OnCompleteUpdateResponsePerms ( false );
					}
				});	
			}
		//	}														
		//}
		}
		
		if( cntResponsesToBreak == 0 )
		{
			OnCompleteUpdateResponsePerms ( true );
		}
	}

//reset permissions on EA folder here
//rename all ea items
//rename all response docs
//rename all ea folders
//rename all ea docs


/*var folderPath = Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameResponseDocs() + "/" + m_responseTitle;
var responseDocQuery2 = new SP.CamlQuery();
responseDocQuery2.set_viewXml('<View Scope="RecursiveAll"><Query><Where><And><Eq><FieldRef Name=\'FileDirRef\'/><Value Type=\'Text\'>' + folderPath + '</Value></Eq><Eq><FieldRef Name=\'DocumentStatus\'/><Value Type=\'Text\'>Submitted</Value></Eq></And></Where></Query></View>');
responseDocSubmittedItems = responseDocLib.getItems( responseDocQuery2 );
currCtx.load(responseDocSubmittedItems, "Include(ID, DocumentStatus, FileDirRef)");
*/


	function m_fnRenameResponses( oRequest, oldRrequestNumber, newRequestNumber )
	{
		for( var x = 0; x < oRequest.responses.length; x++ )
		{
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();
			
			var title = oRequest.responses[x].title;
			var newTitle = title.replace( oldRrequestNumber, newRequestNumber );
			oRequest.responses[x].item.set_item("Title", newTitle);
			oRequest.responses[x].item.update();

			currCtx.executeQueryAsync
			(
				function () 
				{	
				}, 
				function (sender, args) 
				{
				}
			);
		}
	}

	function m_fnRenameResponseFolders( responseDocsFoldersItems, oldRrequestNumber, newRequestNumber  )
	{
		var listItemEnumerator = responseDocsFoldersItems.getEnumerator();
		while(listItemEnumerator.moveNext())
		{
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var oListItemResponseDocFolder = listItemEnumerator.get_current();
		
			var itemName = oListItemResponseDocFolder.get_displayName();

			var test = itemName.replace( oldRrequestNumber, ""); //cant do an index test because there could be hyphens in the request number
			if( test.charAt(0) == "-")
			{
				var newTitle = itemName.replace( oldRrequestNumber, newRequestNumber  );
				oListItemResponseDocFolder.set_item( "FileLeafRef", newTitle );
				oListItemResponseDocFolder.set_item( "Title", newTitle );
				oListItemResponseDocFolder.update();
				
				currCtx.executeQueryAsync
				(
					function () 
					{	
					}, 
					function (sender, args) 
					{
					}
				);
			}
		}
	}
	
	function m_fnRenameResponsesDocs( responseDocsItems, oldRrequestNumber, newRequestNumber )
	{
		var listItemEnumerator = responseDocsItems.getEnumerator();
		while(listItemEnumerator.moveNext())
		{
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var oListItemResponseDocItem = listItemEnumerator.get_current();
		
			var itemName = oListItemResponseDocItem.get_displayName();

			var test = itemName.replace( oldRrequestNumber, ""); //cant do an index test because there could be hyphens in the request number
			if( test.charAt(0) == "-")
			{
				var newTitle = itemName.replace( oldRrequestNumber, newRequestNumber  );
				oListItemResponseDocItem.set_item( "FileLeafRef", newTitle );
				oListItemResponseDocItem.set_item( "Name", newTitle );
				oListItemResponseDocItem.update();
				
				currCtx.executeQueryAsync
				(
					function () 
					{	
					alert("updated response doc");
					}, 
					function (sender, args) 
					{
					alert("failed updated response doc");
					}
				);
			}
		}
	}
	
	function m_fnRenameEmailFolder( emailListFolderItems, oldRrequestNumber, newRequestNumber )
	{
		//rename the EMail Folder
		var listItemEnumerator = emailListFolderItems.getEnumerator();
		while(listItemEnumerator.moveNext())
		{
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var oListItemEmailFolder = listItemEnumerator.get_current();
			
			var itemName = oListItemEmailFolder.get_displayName();
			if( oldRrequestNumber == itemName )
			{
				var newTitle = itemName.replace( oldRrequestNumber, newRequestNumber );
				oListItemEmailFolder.set_item( "FileLeafRef", newTitle );
				oListItemEmailFolder.set_item( "Title", newTitle );
				oListItemEmailFolder.update();
				
				currCtx.executeQueryAsync
				(
					function () 
					{	
					}, 
					function (sender, args) 
					{
					}
				);
			}
		}	
	}

	//rename the External Auditor response folder
	function m_fnRenameEAFolder( eaListFolderItems, oldRrequestNumber, newRequestNumber )
	{
		//rename the EA folder
		var listItemEnumerator = eaListFolderItems.getEnumerator();
		while(listItemEnumerator.moveNext())
		{
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var oListItemEAFolder = listItemEnumerator.get_current();
			
			var itemName = oListItemEAFolder.get_displayName();
			if( oldRrequestNumber == itemName )
			{
				var newTitle = itemName.replace( oldRrequestNumber, newRequestNumber );
				oListItemEAFolder.set_item( "FileLeafRef", newTitle );
				oListItemEAFolder.set_item( "Title", newTitle );
				oListItemEAFolder.update();

				currCtx.executeQueryAsync
				(
					function () 
					{	
					}, 
					function (sender, args) 
					{
					}
				);
			}
		}
	}

	function OnCallbackFormEditRequest(result, value)
	{
		if (result === SP.UI.DialogResult.OK) 
		{
			m_bIsTransactionExecuting = true;
			
			notifyId = SP.UI.Notify.addNotification("Please wait...", false);
			document.body.style.cursor = 'wait';
		
			//alert( "must grant the new updated action offices permissions to this request");
		
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var requestList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleRequests() );
			var requestQuery = new SP.CamlQuery();				
			requestQuery.set_viewXml('<View><Query><Where><Eq><FieldRef Name="ID"/><Value Type="Text">' + m_itemID + '</Value></Eq></Where></Query></View>');
			requestItems = requestList.getItems( requestQuery );
			//request status has internal name as response status in the request list
			currCtx.load( requestItems, 'Include(ID, Title, ActionOffice, ReqStatus, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');

			var emailList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleEmailHistory() );
			var emailListQuery = new SP.CamlQuery();	
			emailListQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID"/></OrderBy><Where><Eq><FieldRef Name="FSObjType"/><Value Type="Text">1</Value></Eq></Where></Query></View>');
			emailListFolderItems = emailList.getItems( emailListQuery );
			currCtx.load( emailListFolderItems, 'Include(ID, Title, DisplayName)');

			var eaList = web.get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocsEA() );
			var eaListQuery = new SP.CamlQuery();	
			eaListQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID"/></OrderBy><Where><Eq><FieldRef Name="FSObjType"/><Value Type="Text">1</Value></Eq></Where></Query></View>');
			eaListFolderItems = eaList.getItems( eaListQuery );
			currCtx.load( eaListFolderItems, 'Include(ID, Title, DisplayName)');

/*
3/13/2017 - removed because this wasnt being used... response folder permissions are loaded when user is directed to tab 3

			var responseDocsLibFolderslist = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocs() );
			//oTargetCTypes = list.get_contentTypes();
			//rootFolder = list.get_rootFolder();	
			var responseDocsLibFolderslistQuery = new SP.CamlQuery();
		    responseDocsLibFolderslistQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="Name"/></OrderBy><Where><Eq><FieldRef Name="FSObjType" /><Value Type="Lookup">1</Value></Eq></Where></Query></View>');
			responseDocsLibFolderslistQuery.set_folderServerRelativeUrl( Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameResponseDocs() );
			responseDocsFoldersItems = responseDocsLibFolderslist.getItems(responseDocsLibFolderslistQuery);
			currCtx.load(responseDocsFoldersItems, "Include( DisplayName, Id, EncodedAbsUrl, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))");
*/	
			function onSuccess() 
			{			
				function m_fnUpdateEmailFolderPerms( requestNum, bRefresh)
				{
					var listItemEnumerator1 = emailListFolderItems.getEnumerator();
					while(listItemEnumerator1.moveNext()) //reset action offices if they were changes in the request form
					{
						var oEmailFolderItem = listItemEnumerator1.get_current();
					
						if( oEmailFolderItem.get_displayName() == requestNum )
						{
							m_fnBreakEmailFolderPermissions( oEmailFolderItem, oListItem, bRefresh );
							break;
						}
					}
				}
			
				var listItemEnumerator = requestItems.getEnumerator();
				while(listItemEnumerator.moveNext()) //reset action offices if they were changes in the request form
				{
					var oListItem = listItemEnumerator.get_current();
						
					if( m_requestNum == oListItem.get_item("Title") ) //if request number hasn't changed
					{
						m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Information", "Please wait... Updating Request and Response permissions <div id='divMsgEditRequest'></div>", 200, 400);

						var bDoneBreakingReqPermisions = false;
						m_fnBreakRequestPermissions( oListItem, false, null, function( bDoneBreakingReqPermisions )
						{
							if( bDoneBreakingReqPermisions ) //should always be true even if an error occurred
							{
								$("#divMsgEditRequest").text("Updated Request permissions");
								
								var doneUpdatingResponses = false;
								//m_fnUpdateAllResponsePermissions( oListItem.get_item("ReqStatus"), m_requestNum, this.responseDocsFoldersItems,  true, function( doneUpdatingResponses )
								m_fnUpdateAllResponsePermissions( oListItem.get_item("ReqStatus"), m_requestNum, true, function( doneUpdatingResponses )
								{
									if( doneUpdatingResponses )
									{									
										m_fnUpdateEmailFolderPerms( m_requestNum, true );
									}
								} );
							}
						});
					}
					else //if request number changed, update responses; otherwise it will refresh and not hit this
					{
						m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Renaming Responses", "Please wait... Renaming Responses", 200, 400);

						var bDoneBreakingReqPermisions = false;
						m_fnBreakRequestPermissions( oListItem, false, null, function( bDoneBreakingReqPermisions )
						{
							if( bDoneBreakingReqPermisions ) //should always be true even if an error occurred
							{
								var oRequest = m_fnGetRequestByNumber( m_requestNum );
								
								var newRequestNumber = oListItem.get_item("Title");
//TODO: break these up - may cause errors		
								m_fnRenameResponses( oRequest, m_requestNum, newRequestNumber);
								m_fnRenameResponseFolders( m_ResponseDocsFoldersItems, m_requestNum, newRequestNumber);
								m_fnRenameEmailFolder( emailListFolderItems, m_requestNum, newRequestNumber);
								m_fnRenameEAFolder( eaListFolderItems, m_requestNum, newRequestNumber);
								
								setTimeout( function(){ m_fnRefresh(newRequestNumber); }, 20000 );
							}
						});
					}
				}
			}
			function onFail(sender, args) 
			{		
					m_fnRefresh();
			}
	
			var data = {requestItemId: m_itemID }
		    currCtx.executeQueryAsync(Function.createDelegate(data, onSuccess), Function.createDelegate(data, onFail));
		}
		else
			m_bIsTransactionExecuting = false;
	}

	function OnCallbackFormCoverSheet( result, value )
	{
		if (result === SP.UI.DialogResult.OK) 
		{
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var coversheetList = web.get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleCoverSheets() );
			var coversheetQuery = new SP.CamlQuery();	
			coversheetQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="Modified" Ascending="FALSE"/></OrderBy></Query><RowLimit>1</RowLimit></View>');
			coversheetItems = coversheetList .getItems( coversheetQuery );
			currCtx.load( coversheetItems, 'Include(ID, Title, ActionOffice, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');
			
			currCtx.executeQueryAsync
			(
				function () 
				{	
					var listItemEnumerator = coversheetItems.getEnumerator();
					var oListItem = null;
					while(listItemEnumerator.moveNext())
					{
						oListItem = listItemEnumerator.get_current();
						break;
					}
					
					if( oListItem )
					{
						m_waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose("Information", "Please wait... Updating permissions on Coversheet", 200, 600);

						m_fnBreakCoversheetPermissions( oListItem, false, true );
					}
				}, 
				function (sender, args) 
				{
					//alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
					m_fnRefresh();
				}
			);
		}
		else
			m_bIsTransactionExecuting = false;
	}
	
	function OnCallbackFormBulkAddResponse( result, value)
	{
		//this is a field on this page that gets updated by the bulkupdate page if a bulk update operation has run
		if( $("#divRanBulkUpdate").text() == 1 ) 
			m_fnRefresh();
	}

	function OnCallbackFormNewResponse( result, value )
	{
		if (result === SP.UI.DialogResult.OK) 
		{
			//m_fnRefresh();
			
			//get last item inserted
			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			var responseList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleResponses() );
			var responseQuery = new SP.CamlQuery();	
			responseQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID" Ascending="FALSE"/></OrderBy></Query><RowLimit>1</RowLimit></View>');
			responseItems = responseList.getItems( responseQuery );
			currCtx.load( responseItems , 'Include(ID, Title, ActionOffice, ReqNum, ResStatus, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');
	
			currCtx.executeQueryAsync
			(
				function () 
				{	
					var oListItem = null;
					
					var listItemEnumerator = responseItems.getEnumerator();
					while(listItemEnumerator.moveNext())
					{
						oListItem = listItemEnumerator.get_current();
						if( oListItem && !oListItem.get_hasUniqueRoleAssignments() )
							m_fnBreakResponsePermissions( oListItem, false, true );
							
						break;
					}
					
					if( oListItem == null )
						return;
					
					var responseTitle = oListItem.get_item("Title");
					var requestNum = oListItem.get_item("ReqNum").get_lookupValue();

					this.currentUser = currCtx.get_web().get_currentUser();
					this.ownerGroup = currCtx.get_web().get_associatedOwnerGroup();
				 	this.memberGroup = currCtx.get_web().get_associatedMemberGroup();
				 	this.visitorGroup = currCtx.get_web().get_associatedVisitorGroup();

					
					var responseDocLib = currCtx.get_web().get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocs() );
					var itemCreateInfo = new SP.ListItemCreationInformation();
					itemCreateInfo.set_underlyingObjectType( SP.FileSystemObjectType.folder );
					itemCreateInfo.set_leafName( responseTitle );
					oListFolderItem = responseDocLib.addItem( itemCreateInfo );			
					oListFolderItem.set_item("Title", responseTitle );
					oListFolderItem.update();
					
					oListFolderItem.breakRoleInheritance(false, false);
				
					//add owner group
					var roleDefBindingColl = SP.RoleDefinitionBindingCollection.newObject( currCtx );
					roleDefBindingColl.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.administrator) );
					oListFolderItem.get_roleAssignments().add( ownerGroup, roleDefBindingColl );
					
					//add member group
					var roleDefBindingColl2 = SP.RoleDefinitionBindingCollection.newObject( currCtx );
					roleDefBindingColl2.add( currCtx.get_web().get_roleDefinitions().getByType( SP.RoleType.contributor) );
					oListFolderItem.get_roleAssignments().add( memberGroup, roleDefBindingColl2 );
					
					//add visitor group
					var roleDefBindingColl3 = SP.RoleDefinitionBindingCollection.newObject( currCtx );
					roleDefBindingColl3.add( currCtx.get_web().get_roleDefinitions().getByName( "Restricted Read") );
					oListFolderItem.get_roleAssignments().add( visitorGroup, roleDefBindingColl3 );
				
					//add action office
					var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName(oListItem.get_item("ActionOffice").get_lookupValue());	
					var actionOfficeGroupObj = Audit.Common.Utilities.GetSPSiteGroup( actionOfficeGroupName );
					if( actionOfficeGroupObj != null )
					{
						var roleDefBindingColl4 = SP.RoleDefinitionBindingCollection.newObject( currCtx );
						roleDefBindingColl4.add( currCtx.get_web().get_roleDefinitions().getByName( "Restricted Contribute" ) );
						oListFolderItem.get_roleAssignments().add( actionOfficeGroupObj, roleDefBindingColl4 );
					}
								
					//delete current logged in user from permissions because it gets added by default
					oListFolderItem.get_roleAssignments().getByPrincipal( currentUser ).deleteObject();

					currCtx.executeQueryAsync
					(
						function () 
						{	
							m_fnRefresh();
						},
						function (sender, args) 
						{
							//alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
							m_fnRefresh();
						}
					);

				}, 
				function (sender, args) 
				{
					//alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
					m_fnRefresh();
				}
			);
		}
		else
			m_bIsTransactionExecuting = false;
	}
	
	var m_countCSToUpdateOnEditResponse = 0;
	var m_countCSUpdatedOnEditResponse = 0;

	function OnCallbackFormEditResponse( result, value )
	{
		m_countCSToUpdateOnEditResponse = 0;
		m_countCSUpdatedOnEditResponse = 0;
		
		if (result === SP.UI.DialogResult.OK) 
		{
			document.body.style.cursor = 'wait';
			notifyId = SP.UI.Notify.addNotification("Please wait... ", false);

			var currCtx = new SP.ClientContext.get_current();
			var web = currCtx.get_web();

			//get the response that was edited
			var responseList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleResponses() );
			var responseQuery = new SP.CamlQuery();	
			responseQuery.set_viewXml('<View><Query><FieldRef Name="Modified" Ascending="FALSE"/><Where><Eq><FieldRef Name=\'ID\'/><Value Type=\'Text\'>' + m_itemID + '</Value></Eq></Where></Query><RowLimit>1</RowLimit></View>');
			responseItems = responseList.getItems( responseQuery );
			currCtx.load( responseItems, 'Include(ID, Title, ActionOffice, POC, POCCC, ResStatus, ReturnReason, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))');

			//get the response folder of the response that was edited
			var responseDocLib = web.get_lists().getByTitle( Audit.Common.Utilities.GetLibTitleResponseDocs() );
			var responseDocQuery = new SP.CamlQuery();
		    responseDocQuery.set_viewXml('<View><Query><Where><Eq><FieldRef Name=\'FileLeafRef\'/><Value Type=\'Text\'>' + m_responseTitle + '</Value></Eq></Where></Query><RowLimit>1</RowLimit></View>');
		    responseFolderItems = responseDocLib.getItems( responseDocQuery );
			currCtx.load(responseFolderItems, "Include( Title, DisplayName, Id, EncodedAbsUrl, HasUniqueRoleAssignments, RoleAssignments, RoleAssignments.Include(Member, RoleDefinitionBindings))");

			var folderPath = Audit.Common.Utilities.GetSiteUrl() + "/" + Audit.Common.Utilities.GetLibNameResponseDocs() + "/" + m_responseTitle;
			var responseDocQuery2 = new SP.CamlQuery();
		    responseDocQuery2.set_viewXml('<View Scope="RecursiveAll"><Query><Where><And><Eq><FieldRef Name=\'FileDirRef\'/><Value Type=\'Text\'>' + folderPath + '</Value></Eq><Eq><FieldRef Name=\'DocumentStatus\'/><Value Type=\'Text\'>Submitted</Value></Eq></And></Where></Query></View>');
		  	responseDocSubmittedItems = responseDocLib.getItems( responseDocQuery2 );
			currCtx.load(responseDocSubmittedItems, "Include(ID, DocumentStatus, FileDirRef, Created, FileLeafRef)");
		
			var responseDocQuery6 = new SP.CamlQuery();
		    responseDocQuery6.set_viewXml('<View Scope="RecursiveAll"><Query><Where><And><Eq><FieldRef Name=\'FileDirRef\'/><Value Type=\'Text\'>' + folderPath + '</Value></Eq><Eq><FieldRef Name=\'DocumentStatus\'/><Value Type=\'Text\'>Open</Value></Eq></And></Where></Query></View>');
		  	responseDocOpenItems = responseDocLib.getItems( responseDocQuery6 );
			currCtx.load(responseDocOpenItems, "Include(ID, DocumentStatus, FileDirRef, Created, FileLeafRef)");

			var responseDocQuery3 = new SP.CamlQuery();
		    responseDocQuery3.set_viewXml('<View Scope="RecursiveAll"><Query><Where><And><Eq><FieldRef Name=\'FileDirRef\'/><Value Type=\'Text\'>' + folderPath + '</Value></Eq><Eq><FieldRef Name=\'DocumentStatus\'/><Value Type=\'Text\'>Marked for Deletion</Value></Eq></And></Where></Query></View>');
		  	responseDocMarkedForDeletionItems = responseDocLib.getItems( responseDocQuery3);
			currCtx.load(responseDocMarkedForDeletionItems, "Include(ID, DocumentStatus, FileDirRef, Created, FileLeafRef)");
		
			var responseDocQuery4 = new SP.CamlQuery();
		    responseDocQuery4.set_viewXml('<View Scope="RecursiveAll"><Query><Where><And><Eq><FieldRef Name=\'FileDirRef\'/><Value Type=\'Text\'>' + folderPath + '</Value></Eq><Eq><FieldRef Name=\'DocumentStatus\'/><Value Type=\'Text\'>Rejected</Value></Eq></And></Where></Query></View>');
		  	responseDocRejectedItems = responseDocLib.getItems( responseDocQuery4 );
			currCtx.load(responseDocRejectedItems, "Include(ID, DocumentStatus, FileDirRef, Created, FileLeafRef)");

			var responseDocQuery8 = new SP.CamlQuery();
		    responseDocQuery8.set_viewXml('<View Scope="RecursiveAll"><Query><Where><And><Eq><FieldRef Name=\'FileDirRef\'/><Value Type=\'Text\'>' + folderPath + '</Value></Eq><Eq><FieldRef Name=\'DocumentStatus\'/><Value Type=\'Text\'>Sent to QA</Value></Eq></And></Where></Query></View>');
		  	responseDocSentToQAItems = responseDocLib.getItems( responseDocQuery8 );
			currCtx.load(responseDocSentToQAItems, "Include(ID, DocumentStatus, FileDirRef, Created, FileLeafRef)");

			var emailList = web.get_lists().getByTitle( Audit.Common.Utilities.GetListTitleEmailHistory() );
			var emailListQuery = new SP.CamlQuery();	
			emailListQuery.set_viewXml('<View><Query><OrderBy><FieldRef Name="ID"/></OrderBy><Where><Eq><FieldRef Name="FSObjType"/><Value Type="Text">1</Value></Eq></Where></Query></View>');
			emailListFolderItems = emailList.getItems( emailListQuery );
			currCtx.load( emailListFolderItems, 'Include(ID, Title, DisplayName)');

			currCtx.executeQueryAsync
			(
				function () 
				{					
					var oListItem = null;
					var newResponseFolderTitle = null;
					var listItemEnumerator = responseItems.getEnumerator();
					while(listItemEnumerator.moveNext())
					{
						oListItem = listItemEnumerator.get_current();
						newResponseFolderTitle = oListItem.get_item("Title");
						m_fnBreakResponsePermissions( oListItem, false, true );	
						break;
					}
					
					if( oListItem == null )
					{
						alert("Error");
						return;
					}
					
					var responseFolder = null;				
					var listItemEnumerator = responseFolderItems.getEnumerator();
					while(listItemEnumerator.moveNext())
					{
						responseFolder = listItemEnumerator.get_current();			
						m_fnBreakResponseFolderPermissions(responseFolder, oListItem, false, true); 
						break;
					}
					
					if( m_responseTitle != newResponseFolderTitle  )
					{
						responseFolder.set_item("FileLeafRef", newResponseFolderTitle);
						responseFolder.set_item("Title", newResponseFolderTitle);
						responseFolder.update();
					}
					
					function onUpdated1Succeeded() 
					{
						var currCtx2 = new SP.ClientContext.get_current();
						var web2 = currCtx2.get_web();
	

						if( this.oListItem.get_item("ResStatus") == "3-Returned to Action Office" && m_responseStatus != this.oListItem.get_item("ResStatus") ) //status changed
						{
							var oRequest = m_fnGetRequestByNumber( m_requestNum );
							
							var emailSubject = "Please Update your Response for Request Number: " + m_requestNum;
							var emailText = "";
							
							if(  this.oListItem.get_item("ResStatus") == "3-Returned to Action Office" )
							{
								emailText = "<div>Audit Request Reference: <b>{REQUEST_NUMBER}</b></div>" +
								"<div>Audit Request Subject: <b>{REQUEST_SUBJECT}</b></div>" +		
								"<div>Audit Request Due Date: <b>{REQUEST_DUEDATE}</b></div>" +		
								"{POC}" +
								"<div>Return Reason: {RETURN_REASON}</div><br/>"+
								"<div>Please provide responses for the following Sample(s): </div><br/>" +
								"<div>{RESPONSE_TITLES}</div>";

								emailText = emailText.replace("{RETURN_REASON}", this.oListItem.get_item("ReturnReason") );
							}
							else
							{
								emailText = "<div>Audit Request Reference: <b>{REQUEST_NUMBER}</b></div>" +
								"<div>Audit Request Subject: <b>{REQUEST_SUBJECT}</b></div>" +		
								"<div>Audit Request Due Date: <b>{REQUEST_DUEDATE}</b></div>" +		
								"{POC}" +
								"{REQUEST_RELATEDAUDIT}<br/>" +
								"<div>Below are the listed action items that have been requested for the Audit: </div>" +
								"<div>{REQUEST_ACTIONITEMS}<br/></div>" +		
								"<div>Please provide responses for the following Sample(s): </div><br/>" +
								"<div>{RESPONSE_TITLES}</div>";

								emailText = emailText.replace("{REQUEST_ACTIONITEMS}", oRequest.actionItems );
								
								if( oRequest.relatedAudit == null || oRequest.relatedAudit == "" )
									emailText = emailText.replace("{REQUEST_RELATEDAUDIT}", "<div>This is a new request, not similar to previous audit cycles.</div>");	
								else
									emailText = emailText.replace("{REQUEST_RELATEDAUDIT}", "<div>This request is similar to this previous cycle audit: " + oRequest.relatedAudit + "</div>");
							}
					
							emailText = emailText.replace("{REQUEST_NUMBER}",  m_requestNum );
							emailText = emailText.replace("{REQUEST_SUBJECT}", oRequest.subject);
							emailText = emailText.replace("{REQUEST_DUEDATE}", oRequest.internalDueDate );
							emailText = emailText.replace("{RESPONSE_TITLES}", this.newResponseFolderTitle );
							
							
							var ao = this.oListItem.get_item("ActionOffice");
							if( ao != null )
								ao = ao.get_lookupValue();
							else
								ao = "";								
							var actionOfficeGroupName = Audit.Common.Utilities.GetAOSPGroupName( ao )							
							
							//if it has a poc, update the TO field and the poc in the email text
							var poc = this.oListItem.get_item("POC");
							if( poc != null)
							{
								poc = poc.get_lookupValue();
								actionOfficeGroupName = poc;
								var pocCC = this.oListItem.get_item("POCCC");
								if( pocCC != null )
								{
									actionOfficeGroupName += ";" + pocCC.get_lookupValue();
								}
								
								emailText = emailText.replace("{POC}", "<div><b>POC: " + poc + "</b></div><br/>");	
							}
							else
							{
								emailText = emailText.replace("{POC}", "<br/>" );	
							}
												

							
							var itemCreateInfo = new SP.ListItemCreationInformation();
						    itemCreateInfo.set_folderUrl( location.protocol + "//" + location.host + Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameEmailHistory() + "/" + m_requestNum );				    
						    oListItemEmail = emailList.addItem( itemCreateInfo );
						    oListItemEmail.set_item('Title', emailSubject);
						    oListItemEmail.set_item('Body', emailText);
						    oListItemEmail.set_item('To', actionOfficeGroupName );
						    oListItemEmail.set_item('NotificationType', "AO Returned Notification" );
						    oListItemEmail.set_item('ReqNum', m_requestNum );
						    oListItemEmail.set_item('ResID', this.newResponseFolderTitle );
						    oListItemEmail.update();
						    
						    currCtx2.executeQueryAsync
							(
								function () 
								{	
								    document.body.style.cursor = 'default';
					    			setTimeout( function(){ m_fnRefresh()}, 1000 );
								}, 
								function (sender, args) 
								{
									alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
									setTimeout( function(){ m_fnRefresh()}, 200 );
								}
							);
						}
						else if( ( this.oListItem.get_item("ResStatus") == "4-Approved for QA" || this.oListItem.get_item("ResStatus") == "6-Reposted After Rejection" ) && m_responseStatus != this.oListItem.get_item("ResStatus") ) //status changed
						{
							var oRequest = m_fnGetRequestByNumber( m_requestNum );
							
							var bDoneBreakingReqPermisions = false;
							m_fnBreakRequestPermissions(oRequest.item, false, this.oListItem.get_item("ResStatus"), function( bDoneBreakingReqPermisions )
							{
						
								function m_fnGetNewResponseDocTitle( responseDocItem, responseName )
								{
									var createdDate = responseDocItem.get_item("Created");
									var newResponseDocTitle = responseName + "_" + createdDate.format("yyyyMMddTHHmmss") ;
									var oldResponseDocTitle = responseDocItem.get_item("FileLeafRef");
									var docName = oldResponseDocTitle.substring(0, oldResponseDocTitle.lastIndexOf("."));
									var docExt = oldResponseDocTitle.replace(docName, "");
									newResponseDocTitle += docExt;
									return newResponseDocTitle;
								}
							
								var cntForQA = 0;
								if( responseDocSubmittedItems != null )
								{
									var listItemEnumerator1 = responseDocSubmittedItems.getEnumerator();
									while(listItemEnumerator1.moveNext())
									{
										var oListItem1 = listItemEnumerator1.get_current();
									
										oListItem1.set_item("FileLeafRef", m_fnGetNewResponseDocTitle( oListItem1, newResponseFolderTitle ));	
										oListItem1.set_item("DocumentStatus", "Sent to QA");
										oListItem1.update();		
										cntForQA ++;
									}
								}
								if( responseDocOpenItems != null )
								{
									var listItemEnumerator1 = responseDocOpenItems.getEnumerator();
									while(listItemEnumerator1.moveNext())
									{
										var oListItem1 = listItemEnumerator1.get_current();
										
										oListItem1.set_item("FileLeafRef", m_fnGetNewResponseDocTitle( oListItem1, newResponseFolderTitle ));	
										oListItem1.set_item("DocumentStatus", "Sent to QA");
										oListItem1.update();		
										cntForQA ++;
									}
								}
								if( responseDocSentToQAItems != null )
								{
									var listItemEnumerator1 = responseDocSentToQAItems.getEnumerator();
									while(listItemEnumerator1.moveNext())
									{
										var oListItem1 = listItemEnumerator1.get_current();
										cntForQA ++;
									}
								}
								
								//these are the documents that are marked for deletion by the AO
								if( responseDocMarkedForDeletionItems != null )
								{
									arrItemsToRecyle = new Array();
									
									var listItemEnumerator1= responseDocMarkedForDeletionItems.getEnumerator();
									while(listItemEnumerator1.moveNext())
									{
										var oListItem1 = listItemEnumerator1.get_current();
										arrItemsToRecyle.push( oListItem1 );
									}
									
									for( var x = 0; x < arrItemsToRecyle.length; x ++ )
									{
										arrItemsToRecyle[x].deleteObject(); //change this to delete to remove from recycle bin
									}
								}
								
								var cntRejected = 0;
								if( responseDocRejectedItems != null )
								{
									var listItemEnumerator1 = responseDocRejectedItems.getEnumerator();
									while(listItemEnumerator1.moveNext())
									{
										var oListItem1 = listItemEnumerator1.get_current();
										oListItem1.set_item("DocumentStatus", "Archived");
										oListItem1.update();		
										cntRejected++;
									}
								}
													
		 						var requestNumber = oRequest.number
		 						var requestSubject = oRequest.subject;
		 						var internalDueDate = oRequest.internalDueDate;
						    	
						    	var emailSubject = "Your Approval Has Been Requested for Response Number: " + newResponseFolderTitle;
								var emailText = "<div>Audit Request Reference: <b>" + m_requestNum + "</b></div>" +
									"<div>Audit Request Subject: <b>"+ requestSubject + "</b></div>" +		
									"<div>Audit Request Due Date: <b>" + internalDueDate + "</b></div><br/>" +
									"<div>Response: <b><ul><li>" + newResponseFolderTitle + "</li></ul></b></div><br/>" +
									"<div>Please review: <b>" + cntForQA + "</b> documents.</div><br/>";
								
								var itemCreateInfo = new SP.ListItemCreationInformation();
							    itemCreateInfo.set_folderUrl( location.protocol + "//" + location.host + Audit.Common.Utilities.GetSiteUrl() + "/Lists/" + Audit.Common.Utilities.GetListNameEmailHistory() + "/" + m_requestNum );				    
							    oListItemEmail = emailList.addItem( itemCreateInfo );
							    oListItemEmail.set_item( 'Title', emailSubject);
							    oListItemEmail.set_item( 'Body', emailText);
							    oListItemEmail.set_item( 'To', Audit.Common.Utilities.GetGroupNameQA() );
							    oListItemEmail.set_item( 'NotificationType', "QA Notification" );
							    oListItemEmail.set_item( 'ReqNum', m_requestNum );
							    oListItemEmail.set_item( 'ResID', newResponseFolderTitle );
							    oListItemEmail.update();	
								
								currCtx2.executeQueryAsync
								(
									function () 
									{	
										if( oRequest.coversheets == null || oRequest.coversheets.length == 0 )
										{
											setTimeout( function(){ m_fnRefresh()}, 200 );
										}
										else
										{
										   	for( var x = 0; x < oRequest.coversheets.length; x++ )
											{
												m_countCSToUpdateOnEditResponse++;

												//give QA access to the coversheet
												var bDoneBreakingCSOnEditResponse = false;
												m_fnBreakCoversheetPermissions( oRequest.coversheets[x].item, true, false, function()
												{
													m_countCSUpdatedOnEditResponse++;
													
													if( m_countCSToUpdateOnEditResponse == m_countCSUpdatedOnEditResponse )
													{
														setTimeout( function(){ m_fnRefresh()}, 200 );
													}													
												}); 
											}
										}
									}, 
									function (sender, args) 
									{
										alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
										setTimeout( function(){ m_fnRefresh()}, 200 );
									}
								);
					
							});
						}
						else
						{
							document.body.style.cursor = 'default';
			    			setTimeout( function(){ m_fnRefresh()}, 1000 );

						}		
					}
					function onUpdated1Failed(sender, args) 
					{		
						alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
						setTimeout( function(){ m_fnRefresh()}, 200 );
					}
					
					var data = {newResponseFolderTitle: newResponseFolderTitle, oListItem: oListItem};
    				currCtx.executeQueryAsync(Function.createDelegate(data, onUpdated1Succeeded), Function.createDelegate(data, onUpdated1Failed));
				}, 
				function (sender, args) 
				{
					alert( "Request failed: "  + args.get_message() + "\n" + args.get_stackTrace() );
					setTimeout( function(){ m_fnRefresh()}, 200 );
				}
			);
		}	
		else
		{
			m_bIsTransactionExecuting = false;
		}
	}

	function m_fnGoToRequest( requestNumber, responseTitle )
	{
		notifyId = SP.UI.Notify.addNotification("Displaying Request (" + requestNumber + ")", false);

		m_sGoToResponseTitle = null;
		if( responseTitle != null && responseTitle != "" )
			m_sGoToResponseTitle = responseTitle;

		$('#tabs').tabs({ active: 2 });	

		if( $("#ddlReqNum").val() != requestNumber )
			$("#ddlReqNum").val( requestNumber ).change();		
		else if( m_sGoToResponseTitle != null )
		{
			//need to navigate to tab 2 for this to work
			m_fnHighlightResponse();
		}
	}

	function LoadDDOptionsTbl()
	{					
		var arrRequestID = new Array();
		var arrRequestStatus = new Array();
		var arrRequestInternalDueDate = new Array();
		var arrRequestDueDate = new Array();
		var arrRequestAO = new Array();
		var arrRequestResponseCount = new Array();
		
		//var arrResponseRequestID = new Array();
		var arrResponseTitle = new Array();
		var arrResponseSample = new Array();
		var arrResponseStatus = new Array();
		var arrResponseAO = new Array();
		var arrResponseModified = new Array();
		
		var eacher = $(".sr1-request-requestNum");
		eacher.each(function()
		{
			var val = $(this).text();
			//if( !Audit.Common.Utilities.ExistsInArr( arrRequestID, val ))
			if( $.inArray( val, arrRequestID) == -1 )
				arrRequestID.push(val);
		});
		
		var eacher = $(".sr1-request-status");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrRequestStatus, val ))
			if( $.inArray( val, arrRequestStatus) == -1 )
				arrRequestStatus.push(val);
		});
		
		var eacher = $(".sr1-request-internalDueDate");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrRequestInternalDueDate, val ))
			if( $.inArray( val, arrRequestInternalDueDate) == -1 )
				arrRequestInternalDueDate.push(val);
		});

		var eacher = $(".sr1-request-dueDate");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrRequestDueDate, val ))
			if( $.inArray( val, arrRequestDueDate) == -1 )
				arrRequestDueDate.push(val);
		});
				
		var eacher = $(".sr1-request-actionOffice-item");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrRequestAO, val ))
			if( $.inArray( val, arrRequestAO) == -1 )
				arrRequestAO.push(val);
		});		
		
		/*var eacher = $(".sr2-response-requestNum");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrResponseRequestID, val ))
			if( $.inArray( val, arrResponseRequestID) == -1 )
				arrResponseRequestID.push(val);
		});*/
		
		var eacher = $(".sr2-response-title");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrResponseTitle, val ))
			//if( $.inArray( val, arrResponseTitle) == -1 )
				arrResponseTitle.push(val);
		});
		
		var eacher = $(".sr2-response-sample");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrResponseSample , val ))
			if( $.inArray( val, arrResponseSample) == -1 )
				arrResponseSample.push(val);
		});

		var eacher = $(".sr2-response-status");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrResponseStatus , val ))
			if( $.inArray( val, arrResponseStatus) == -1 )
				arrResponseStatus.push(val);
		});
		
		var eacher = $(".sr2-response-ao");
		eacher.each(function()
		{
			var val = $(this).text();
//			if( !Audit.Common.Utilities.ExistsInArr( arrResponseAO, val ))
			if( $.inArray( val, arrResponseAO) == -1 )
				arrResponseAO.push(val);
		});
		
		var eacher = $(".sr2-response-modified");
		eacher.each(function()
		{
			var val = $(this).text();
			if( val != null && val != "" )
			{
				val = val.split(" ")[0];
//				if( !Audit.Common.Utilities.ExistsInArr( arrResponseModified, val ))
				if( $.inArray( val, arrResponseModified) == -1 )
					arrResponseModified.push(val);
			}
		});

		//on tab1
		Audit.Common.Utilities.AddOptions( arrRequestID, "#ddlRequestRequestID", false);
		Audit.Common.Utilities.AddOptions( arrRequestStatus, "#ddlRequestStatus", false);
		Audit.Common.Utilities.AddOptions( arrRequestInternalDueDate, "#ddlRequestInternalDueDate", false);
		Audit.Common.Utilities.AddOptions( arrRequestDueDate, "#ddlRequestDueDate", false);
		Audit.Common.Utilities.AddOptions( arrRequestAO, "#ddlRequestAO", false);
		
		//on tab2
		//Audit.Common.Utilities.AddOptions( arrResponseRequestID, "#ddlResponseRequestID", false);
		Audit.Common.Utilities.AddOptions( arrRequestID, "#ddlResponseRequestID", false);
		Audit.Common.Utilities.AddOptions( arrRequestInternalDueDate, "#ddlResponseRequestInternalDueDate", false);
		Audit.Common.Utilities.AddOptions( arrResponseTitle, "#ddlResponseName", false, true);
		Audit.Common.Utilities.AddOptions( arrResponseSample, "#ddlResponseSampleNum", false);
		Audit.Common.Utilities.AddOptions( arrResponseStatus, "#ddlResponseStatus", false);
		Audit.Common.Utilities.AddOptions( arrResponseAO, "#ddlResponseAO", false);
		Audit.Common.Utilities.AddOptions( arrResponseModified , "#ddlResponseModified", true);
		
		$("#ddlResponseModified option").eq(1).before($("<option></option>").val("This Quarter").text("This Quarter"));
		$("#ddlResponseModified option").eq(1).before($("<option></option>").val("This Month").text("This Month"));
		$("#ddlResponseModified option").eq(1).before($("<option></option>").val("Last 7 Days").text("Last 7 Days"));
	}

	/*function UnBindTableSorter(tableName)
	{
		if( m_bLoaded )
		{
			$( '#' + tableName )
			 .unbind('appendCache applyWidgetId applyWidgets sorton update updateCell')
			 //.removeClass('tablesorter')
			 .find('thead th')
			 .unbind('click mousedown')
			 .removeClass('header headerSortDown headerSortUp');
		}
		m_bLoaded = true;
	}*/

	function BindTableSorter( type, rowCount, tableName)
	{
		if( rowCount > 0 )
		{
			if( type == 0 )
			{
				$( "#" + tableName ).tablesorter(
				{
					//sortList: [[0,0],[1,0]],
					sortList: [[3,0],[0,0]],
					selectorHeaders: '.sorter-true'
				}); 
			}
			else if( type == 1 )
			{
				$( "#" + tableName ).tablesorter(
				{
					sortList: [[7,1]],
					selectorHeaders: '.sorter-true'
				}); 
			}
		}
	}		
	
	
	function BindActionOfficeHandler()
	{
		$(".actionOfficeContainer").click( function()
		{		
			 $(this).parent().find(".sr1-request-actionOffice-item").toggleClass( "collapsed" ); 
		});
	}
	
	function BindActionOfficeRequestInfoHandler()
	{
		$(".actionOfficeContainerRequestInfo").click( function()
		{		
			 $(this).parent().find(".sr1-request-actionOfficeContainerRequestInfo-item").toggleClass( "collapsed" ); 
		});
	}
	
	function BindHandlersOnLoad()
	{
		$("#linkSubmitNewReq").click(function()
		{
			m_fnCreateRequest();
		});
		
		$(".linkHelpResponseDocs").click(function()
		{
			m_fnDisplayHelpResponseDocs();
		});
		

		$("#ddlReqNum").change(function(){
			LoadRequestInfo( $(this).val() );
		});

		$(".warning").click(function()
		{
			 $(this).parent().find("div").toggleClass( "collapsed" ); 
			 $(this).parent().toggleClass( "colorRedLegend" ); 
		});
		
		BindActionOfficeHandler();

		$("#btnViewAllRequests").click(function()
		{
			m_fnClearFilterRequests();
		});
		
		$("#btnViewAllResponses").click(function()
		{
			m_fnClearFilterResponses();
		});

		$( "#ddlRequestRequestID, #ddlRequestStatus, #ddlRequestInternalDueDate, #ddlRequestDueDate, #ddlRequestSample, #ddlRequestSentEmail, #ddlRequestAO" ).change(function()
		{
			document.body.style.cursor = 'wait';
			setTimeout( function(){ m_fnFilterRequests()}, 200 );
		});

		$( "#ddlResponseRequestID, #ddlResponseRequestInternalDueDate, #ddlResponseName, #ddlResponseSampleNum, #ddlResponseStatus, #ddlResponseAO, #ddlResponseModified" ).change(function()
		{
			document.body.style.cursor = 'wait';
			setTimeout( function(){ m_fnFilterResponses()}, 200 );
		});
		
		BindPrintButton("#btnPrint1", "#divStatusReportRequests", "Request Status Report");
		BindPrintButton("#btnPrint2", "#divStatusReportRespones", "Response Status Report");

		//////////Note: for the export to work, make sure this is added to the html: <iframe id="CsvExpFrame" style="display: none"></iframe>
		BindExportButton(".export1", "RequestStatusReport_", "tblStatusReportRequests");
		BindExportButton(".export2", "ResponseStatusReport_", "tblStatusReportResponses");
	}
	
	function BindPrintButton(btnPrint, divTbl, pageTitle)
	{
		$( btnPrint ).on("click", function(){ PrintPage( pageTitle, divTbl); });
	}
	
	function BindExportButton(btnExport, fileNamePrefix, tbl)
	{
		$(btnExport).on('click', function (event) 
		{
			var curDate = new Date().format("yyyyMMdd_hhmmtt");
			ExportToCsv( fileNamePrefix + curDate, tbl );
	    });
	}
	
	function m_fnToggleResFolderPerms()
	{
		if($('.response-permissions').is(':visible'))
		{
		    $('.response-permissions').hide();
		}
		else
		{
		    $('.response-permissions').show();
		}
	}

	function m_fnClearFilterRequests()
	{
		$("#ddlRequestRequestID").val("");
		$("#ddlRequestStatus").val("");
		$("#ddlRequestInternalDueDate").val("");
		$("#ddlRequestDueDate").val("");
		$("#ddlRequestSample").val("");
		$("#ddlRequestSentEmail").val("");
		$("#ddlRequestAO").val("");
		
		m_fnFilterRequests();
	}

	function m_fnClearFilterResponses()
	{
		$("#ddlResponseRequestID").val("");
		$("#ddlResponseRequestStatus").val("");
		$("#ddlResponseRequestInternalDueDate").val("");
		$("#ddlResponseName").val("");
		$("#ddlResponseSampleNum").val("");
		$("#ddlResponseStatus").val("");
		$("#ddlResponseAO").val("");
		$("#ddlResponseModified").val("");
		$("#ddlResponseRequestInternalDueDate").val("");
		
		m_fnFilterResponses();
	}

	//Captures the values from all of the drop downs and uses them to filter the rows
	function m_fnFilterRequests() 
	{			
		var requestID = $("#ddlRequestRequestID").val();
		var requestStatus = $("#ddlRequestStatus").val();
		var internalDueDate = $("#ddlRequestInternalDueDate").val();
		var dueDate = $("#ddlRequestDueDate").val();
		var requestSample = $("#ddlRequestSample").val();
		var requestSentEmail = $("#ddlRequestSentEmail").val();
		var requestAO = $("#ddlRequestAO").val();
			
		//each row in the data form web part is marked with this class; it iterates through each to find the containing class to see if it matches
		//the value that has been selected in the drop down
		var cntVisible = 0;
		var cntRows = 0;
		
		var eacher = $(".sr1-request-item");

		eacher.each(function() 
		{			
			cntRows ++;
			var hide = false;
			
			if( !hide && requestID != "" && $.trim( $(this).find(".sr1-request-requestNum").text() ) != requestID )
			{
				hide = true;
			}		
			if( !hide && requestStatus != "" && $.trim( $(this).find(".sr1-request-status").text()).indexOf( requestStatus ) < 0 )
			{
				hide = true;
			}	
			if( !hide && internalDueDate != "" && $.trim( $(this).find(".sr1-request-internalDueDate").text() ) != internalDueDate )
			{
				hide = true;				
			}		
			if( !hide && dueDate != "" && $.trim( $(this).find(".sr1-request-dueDate").text() ) != dueDate )
			{
				hide = true;				
			}		
			if( !hide && requestSample != "" && $.trim( $(this).find(".sr1-request-sample").text() ) != requestSample )
			{
				hide = true;				
			}		
			if( !hide && requestSentEmail != "" && $.trim( $(this).find(".sr1-request-sentEmail").text() ) != requestSentEmail )
			{
				hide = true;				
			}		
			if( !hide && requestAO != "" )
			{
				var bFound = false;
				$(this).find(".sr1-request-actionOffice-item").each(function()
				{
					if( $(this).text() == requestAO )
					{
						bFound = true;
						return;
					}
				});
				if( !bFound )
					hide = true;				
			}			

			if( hide )
				$(this).hide();
			else
			{
				$(this).show();
				cntVisible++;
			}
		});
		
		//Get the number of rows currently displayed and output that number to the user
	    var numOfVisibleRows = cntVisible;//$('.sr1-request-item:visible').length;
	    var numRows = cntRows;//$('.sr1-request-item').length;

		$("#spanRequestsDisplayedTotal").text( numOfVisibleRows );   		
		document.body.style.cursor = 'default';
		
		if( numRows == numOfVisibleRows )
			$("#btnViewAllRequests").hide();
		else
			$("#btnViewAllRequests").show();
	}

	//Captures the values from all of the drop downs and uses them to filter the rows
	function m_fnFilterResponses() 
	{		
		var requestID = $("#ddlResponseRequestID").val();
		var dueDate = $("#ddlResponseRequestInternalDueDate").val();
		var responseName = $("#ddlResponseName").val();
		var sampleNum = $("#ddlResponseSampleNum").val();
		var responseStatus = $("#ddlResponseStatus").val();
		var actionOffice = $("#ddlResponseAO").val();
		var modified = $("#ddlResponseModified").val();
			
		//each row in the data form web part is marked with this class; it iterates through each to find the containing class to see if it matches
		//the value that has been selected in the drop down
		var cntVisible = 0;
		var cntRows = 0;
				
		var eacher = $(".sr2-response-item");
		eacher.each(function() 
		{		
			cntRows++;	
			var hide = false;
			
			if( !hide && requestID != "" && $.trim( $(this).find(".sr2-response-requestNum").text() ) != requestID )
			{
				hide = true;
			}		
			if( !hide && dueDate != "" && $.trim( $(this).find(".sr2-response-internalDueDate").text() ) != dueDate )
			{
				hide = true;
			}	
			if( !hide && responseName!= "" && $.trim( $(this).find(".sr2-response-title").text() ) != responseName)
			{
				hide = true;				
			}		
			if( !hide && sampleNum != "" && $.trim( $(this).find(".sr2-response-sample").text() ) != sampleNum )
			{
				hide = true;				
			}		
			if( !hide && responseStatus != "" && $.trim( $(this).find(".sr2-response-status").text() ) != responseStatus )
			{
				hide = true;				
			}		
			if( !hide && actionOffice!= "" && $.trim( $(this).find(".sr2-response-ao").text() ) != actionOffice)
			{
				hide = true;				
			}		
			if( !hide && modified != "" )
			{
				var curDate = new Date();
				var responseModifiedDate = $(this).find(".sr2-response-modified").text();
								
				if( modified == "Last 7 Days" )
				{
					var modifiedDate = new Date( responseModifiedDate );
					curDate.setDate( curDate.getDate() - 7 );
					if( curDate > modifiedDate )
						hide = true;
					
				}
				else if( modified == "This Month" )
				{
					var modifiedDate = new Date ( responseModifiedDate );
					curDate.setDate( 1 );
					if( curDate > modifiedDate )
						hide = true;

				}
				else if( modified == "This Quarter" )
				{
					var modifiedDate = new Date ( responseModifiedDate );
					
					if( modifiedDate.getFullYear() != curDate.getFullYear() )
					{
						hide = true;
					}
					else
					{
						var modifiedMonth = modifiedDate.getMonth();
						var curMonth = curDate.getMonth();
						
						if( curMonth == 0 || curMonth == 1 || curMonth == 2 )
						{
							if( modifiedMonth != 0 && modifiedMonth != 1 && modifiedMonth != 2 ) 
							{
								hide = true;
							}
						}
						else if( curMonth == 3 || curMonth == 4 || curMonth == 5 )
						{
							if( modifiedMonth != 3 && modifiedMonth != 4 && modifiedMonth != 5 ) 
							{
								hide = true;
							}
						}
						else if( curMonth == 6 || curMonth == 7 || curMonth == 8 )
						{
							if( modifiedMonth != 6 && modifiedMonth != 7 && modifiedMonth != 8 ) 
							{
								hide = true;
							}
						}
						else if( curMonth == 9 || curMonth == 10 || curMonth == 11 )
						{
							if( modifiedMonth != 9 && modifiedMonth != 10 && modifiedMonth != 11 ) 
							{
								hide = true;
							}
						}
					}
				}
				else if( $.trim(responseModifiedDate).indexOf( modified ) < 0  )
					hide = true;				
			}		

			if( hide )
				$(this).hide();
			else
			{
				$(this).show();
				cntVisible++;
			}
		});
		
		//Get the number of rows currently displayed and output that number to the user
	    var numOfVisibleRows = cntVisible;//$('.sr2-response-item:visible').length;
	    var numRows = cntRows;//$('.sr2-response-item').length;

		$("#spanResponsesDisplayedTotal").text( numOfVisibleRows );   		
		document.body.style.cursor = 'default';

		if( numRows == numOfVisibleRows )
			$("#btnViewAllResponses").hide();
		else
			$("#btnViewAllResponses").show();			
	}
	
	function PrintPage( pageTitle, divTbl )
	{
		var curDate = new Date();
		var siteUrl = Audit.Common.Utilities.GetSiteUrl();
		var cssLink1 = siteUrl + "/siteassets/css/tablesorter/style.css?v=" + curDate.format("MM_dd_yyyy");
		var cssLink2 = siteUrl + "/siteAssets/css/Audit_Styles.css?v=" + curDate.format("MM_dd_yyyy");
	
	 	var divOutput = $( divTbl ).html();
	 	
	 	//remove hyperlinks pointing to the job codes
   		var updatedDivOutput = $("<div>").append( divOutput );	   		
   		updatedDivOutput.find(".sr1-request-requestNum a").each( function(){
   			$(this).removeAttr("onclick");
   			$(this).removeAttr("href");
   		});
		
   		updatedDivOutput.find(".sr2-response-requestNum a").each( function(){
   			$(this).removeAttr("onclick");
   			$(this).removeAttr("href");
   		});
  
   		divOutput = updatedDivOutput.html();
   		
		 
	 	var printDateString = curDate.format("MM/dd/yyyy hh:mm tt");
	 	printDateString = "<div style='padding-bottom:10px;'>" + printDateString + " - " + pageTitle + "</div>";	
	 	
		divOutput = printDateString + divOutput;
		
		var cssFile1 = $('<div></div>');
		var cssFile2 = $('<div></div>');
		
		var def1 = $.Deferred();
   		var def2 = $.Deferred();  	   		
	   		
   		var cssFileText = "";
   		cssFile1.load( cssLink1, function() { cssFileText += "<style>" + cssFile1.html() + "</style>"; def1.resolve()} );
		cssFile2.load( cssLink2, function() { cssFileText += "<style>" + cssFile2.html() + "</style>"; def2.resolve()} );

		//gets called asynchronously after the css files have been loaded
		$.when(def1, def2).done(function(){
				
		 	var html = "<HTML>\n" + 
		 		"<HEAD>\n\n"+  
					"<Title>" + pageTitle + "</Title>\n" + 
					cssFileText + "\n" +
					"<style>"+
						".hideOnPrint, .rowFilters, .actionOfficeContainer {display:none}"+
					"</style>\n"+
				"</HEAD>\n" + 
				"<BODY>\n" + divOutput + "\n" +"</BODY>\n" + 
				"</HTML>";  
		
		
		 	var printWP = window.open("","printWebPart");
		    printWP.document.open();
		    //insert content
		    printWP.document.write(html);
		    	
		    printWP.document.close();
		     //open print dialog
		    printWP.print();
   		});	   
	}
	//make sure iframe with id csvexprframe is added to page up top
	//http://stackoverflow.com/questions/18185660/javascript-jquery-exporting-data-in-csv-not-working-in-ie
	function ExportToCsv(fileName, tableName, removeHeader) 
	{
		var data = GetCellValues(tableName);
		
		if( removeHeader == true )
			data = data.slice(1);
			
		
		var csv = ConvertToCsv(data);
		//	console.log( csv );
		if (navigator.userAgent.search("Trident") >= 0) 
		{
			window.CsvExpFrame.document.open("text/html", "replace");
	//		window.CsvExpFrame.document.open("application/csv", "replace");
	//		window.CsvExpFrame.document.charset = "utf-8";
	//		window.CsvExpFrame.document.open("application/ms-excel", "replace");
			window.CsvExpFrame.document.write(csv);
			window.CsvExpFrame.document.close();
			window.CsvExpFrame.focus();
			window.CsvExpFrame.document.execCommand('SaveAs', true, fileName + ".csv");
		} 
		else 
		{
			var uri = "data:text/csv;charset=utf-8," + escape(csv);
			var downloadLink = document.createElement("a");
			downloadLink.href = uri;
			downloadLink.download = fileName + ".csv";
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
		}
	};

	function GetCellValues(tableName) 
	{
		var table = document.getElementById( tableName );
		
		//remove headers and footers
		if(table.innerHTML.indexOf("rowFilters") >= 0 )
		{
			var deets = $("<div>").append( table.outerHTML );	   		
		 	deets.find(".rowFilters").each( function(){
				$(this).remove();
	   		});
			table = deets.find("table")[0];
		}		
		if(table.innerHTML.indexOf("footer") >= 0 )
		{
			var deets = $("<div>").append( table.outerHTML );	   		
		 	deets.find(".footer").each( function(){
				$(this).remove();
	   		});
			table = deets.find("table")[0];
		}	
		
		if(table.innerHTML.indexOf("actionOfficeContainer") >= 0 )
		{
			var deets = $("<div>").append( table.outerHTML );	   		
		 	deets.find(".actionOfficeContainer").each( function(){
				$(this).remove();
	   		});
	   		
		 	deets.find(".sr1-request-actionOffice-item").each( function(){
		 		var curText = $(this).text() + ", ";
		 		
				$(this).text( curText );
	   		});
	   		
			table = deets.find("table")[0];
		}	
		
	
			
		var tableArray = [];
		for (var r = 0, n = table.rows.length; r < n; r++) 
		{
			tableArray[r] = [];
			for (var c = 0, m = table.rows[r].cells.length; c < m; c++) 
			{
				var text = table.rows[r].cells[c].textContent || table.rows[r].cells[c].innerText;
				tableArray[r][c] = text.trim();
			}
		}
		return tableArray;
	}

	function ConvertToCsv(objArray) 
	{
		var array = typeof objArray != "object" ? JSON.parse(objArray) : objArray;
		var str = "sep=,\r\n";
		var line = "";
		var index;
		var value;
		for (var i = 0; i < array.length; i++) 
		{
			line = "";
			var array1 = array[i];
			for (index in array1) 
			{
				if (array1.hasOwnProperty(index)) 
				{
					value = array1[index] + "";
					line += "\"" + value.replace(/"/g, "\"\"") + "\",";
				}
			}
			line = line.slice(0, -1);
			str += line + "\r\n";
		}
		return str;
	};

	
	var publicMembers = 
	{
		Load: m_fnLoadData,
		ViewLateRequests: m_fnViewLateRequests,
		ViewPermissions: m_fnViewPermissions,
		ViewResponseDocsToday: m_fnViewResponseDocsToday,
		//GoToResponseDocs: function(responseTitle){ m_fnGoToResponseDocs(responseTitle); },
		ViewRequest: function(id){ m_fnViewRequest(id); },
		EditRequest: function(id, requestNum){ m_fnEditRequest(id, requestNum); },
		ViewRequestDoc: function(id){ m_fnViewRequestDoc(id); },
		EditRequestDoc: function(id){ m_fnEditRequestDoc(id); },		
		ViewCoverSheet: function(id){ m_fnViewCoverSheet(id); },
		EditCoverSheet: function(id, requestNumber){ m_fnEditCoverSheet(id, requestNumber); },
		BulkAddResponse: function(id){ m_fnBulkAddResponse(id); },
		AddResponse: function(id){ m_fnAddResponse(id); },
		ViewResponse: function(requestNumber, id, responseTitle, responseStatus){ m_fnViewResponse(requestNumber, id, responseTitle, responseStatus); },
		EditResponse: function(requestNumber, id, responseTitle, responseStatus){ m_fnEditResponse(requestNumber, id, responseTitle, responseStatus); },
		ReOpenResponse: function(id, responseTitle){ m_fnReOpenResponse(id, responseTitle); },
		ViewResponseDoc: function(id, requestID, responseID){ m_fnViewResponseDoc(id, requestID, responseID); },
		EditResponseDoc: function(id, requestID, responseID){ m_fnEditResponseDoc(id, requestID, responseID); },
		CheckInResponseDoc: function (folder, fileName) { m_fnCheckInResponseDoc(folder, fileName); },
		ViewResponseDocFolder: function(title){ m_fnViewResponseDocFolder(title); },		
		ViewEmailHistoryFolder: function(requestNum){ m_fnViewEmailHistoryFolder(requestNum); },		
		UploadRequestDoc: function(requestNum){ m_fnUploadRequestDoc(requestNum); },
		DeleteResponseDoc: function(itemID){ m_fnDeleteResponseDoc(itemID); },
		ResendRejectedResponseDocToQA: function(itemID){ m_fnResendRejectedResponseDocToQA(itemID); },		
		UploadCoverSheet: function(requestNum){ m_fnUploadCoverSheet(requestNum); },
		UploadResponseDoc: function(requestID, responseID){ m_fnUploadResponseDoc(requestID, responseID); },
		GrantSpecialPermissions: function(id){ m_fnGrantSpecialPermissions(id); },
		RemoveSpecialPermissions: function(id){ m_fnRemoveSpecialPermissions(id); },
		SendEmail: function(requestID){ m_fnSendEmail(requestID);},
		GoToRequest: function(requestNum, responseTitle){ m_fnGoToRequest(requestNum, responseTitle); },
		ToggleResFolderPerms: function(){ m_fnToggleResFolderPerms(); },
		//CloseRequest: function(requestNumToClose){ m_fnCloseRequest(requestNumToClose); },
		IsTransactionExecuting: function(){ return m_bIsTransactionExecuting; },
		Refresh: m_fnRefresh
	}
	
	return publicMembers;
}	
