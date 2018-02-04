/* --------------------------------------------------- */
/* HELP FUNCTIONS                                      */
/* --------------------------------------------------- */

function calcPerformance(perc, year){
    var res = 1;
    for (var i = 2011; i < year; i++){
        res = res * (1 + perc);
    }
    return res;
}

function doInsert(intKey2, paramMonth2) {
    // Insert new key, that has to be predicted
    let output = {};
    output.data = [];
    let conn2 = $.db.getConnection();
    conn2.prepareStatement('SET SCHEMA "GBI_005"').execute();
    let query2 = 'INSERT INTO "PAL_FPR_PREDICTDATA_TBL" '
               + 'values(' + intKey2 + ',?)';
    let st = conn2.prepareStatement(query2);
    st.setString(1,paramMonth2);
    st.execute();
    conn2.commit();
    let record = [];
    record.push(paramMonth2);
    output.data.push(record);
    conn2.close();
	
}

/* --------------------------------------------------- */
/* START OF EXECUTION ON CALL                          */
/* --------------------------------------------------- */

// get url parameters
var paramYear = $.request.parameters.get('year');
var paramMonth = $.request.parameters.get('month');
var paramSalesOrg = $.request.parameters.get('sales_org');
var paramProdGroup = $.request.parameters.get('product_group');
var paramMarketGrowth = parseFloat($.request.parameters.get('market_growth'));

// get internal keys to translate url paramters
try {
    var conn = $.db.getConnection();
    var query = 'SELECT DISTINCT "PRODUCT_GROUP_MAPPED" '
              + 'FROM "_SYS_BIC"."gbi-student-006.SalesDataAnalytics.data/SALES_ALL" '
              + 'WHERE "PRODUCT_GROUP" = \'' + paramProdGroup + '\';';
	
	var pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();
	
	rs.next();
	var paramProdGroupIntKey = rs.getInteger(1) + "";
	
    query = 'SELECT DISTINCT "SALES_ORG_MAPPED" '
          + 'FROM "_SYS_BIC"."gbi-student-006.SalesDataAnalytics.data/SALES_ALL" '
          + 'WHERE "SALES_ORGANISATION" = \'' + paramSalesOrg + '\';';
	
	pstmt = conn.prepareStatement(query);
	rs = pstmt.executeQuery();

	rs.next();
	var paramSalesOrgIntKey = rs.getInteger(1) + "";
	
} catch(e) {
	$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	$.response.setBody("ERROR while catch" + e.message);
}

// get predicted value
try {
    conn = $.db.getConnection();
	
	var intKey = parseInt("" 
	               + paramYear 
	               + paramMonth 
	               + paramSalesOrgIntKey 
	               + paramProdGroupIntKey,10);
	
	// check if predicted result is already there
    query = 'SELECT * FROM "GBI_005"."PAL_FPR_FITTED_TBL" WHERE "ID" = ' + intKey + ';';
	pstmt = conn.prepareStatement(query);
	rs = pstmt.executeQuery();
	if(!rs.next()) {
	
        // check if entry to be predicted is already there
        query = 'SELECT * FROM "GBI_005"."PAL_FPR_PREDICTDATA_TBL" WHERE "ID" = ' + intKey + ';';
    	pstmt = conn.prepareStatement(query);
    	rs = pstmt.executeQuery();
    	if(!rs.next()) {
    	    doInsert(intKey, paramMonth, paramProdGroupIntKey, paramSalesOrgIntKey);
    	}
    
    	// call SAP Predictive Analytics Procedure
    	query = 'CALL "GBI_005"."PAL_FORECAST_POLYNOMIALR_PROC"("GBI_005"."PAL_FPR_PREDICTDATA_TBL", '
    	      + '"GBI_005"."PAL_PR_RESULTS_TBL_' + paramProdGroupIntKey + '_' + paramSalesOrgIntKey + '",'
    	      + '"GBI_005"."PAL_CONTROL_TBL", "GBI_005"."PAL_FPR_FITTED_TBL") with overview;';
    	conn = $.db.getConnection();
    	pstmt = conn.prepareCall(query);
    	pstmt.execute();
    	
	
    	// get predicted result
        query = 'SELECT * '
              + 'FROM "GBI_005"."PAL_FPR_FITTED_TBL" '
              + 'WHERE "ID" = ' + intKey + ';';
    	
    	pstmt = conn.prepareStatement(query);
    	rs = pstmt.executeQuery();
    	
    	rs.next();
	
	}
	
	var result = rs.getDouble(2);
    
    // calculate result
    if (result < 0){
        result = 0;
    } else {
        result = result * calcPerformance(paramMarketGrowth, paramYear);
    }
    
	rs.close();
	pstmt.close();
	conn.close();
	
	// return response
	$.response.contentType = "application/json";
	$.response.headers.set("access-control-allow-origin", "*");
	$.response.setBody(result);
	$.response.status = $.net.http.OK;
	
} catch(e) {
	$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	$.response.setBody("ERROR while catch" + e.message);
}