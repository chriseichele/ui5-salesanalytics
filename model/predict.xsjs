/* --------------------------------------------------- */
/* HELP FUNCTIONS                                      */
/* --------------------------------------------------- */

function createEntryOrg(rs) {
	return {
	    'type': 'Feature',
		'id': "SO" + rs.getInteger(1),
		'value':  rs.getDouble(2)
		};
}

function calcPerformance(perc, year){
    var res = 1;
    for (var i = 2011; i < year; i++){
        res = res * (1 + perc);
    }
    return res;
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

	// clear table to have fresh starting point
	pstmt = conn.prepareStatement("DELETE FROM \"GBI_005\".\"PAL_FPR_PREDICTDATA_TBL\";");
	pstmt.execute();
	conn.commit();
	pstmt.close();
	conn.close();
	
	
    var output = {};
    output.data = [];
    conn = $.db.getConnection();
    conn.prepareStatement("SET SCHEMA \"GBI_005\"").execute();
    var st = conn.prepareStatement("INSERT INTO \"PAL_FPR_PREDICTDATA_TBL\" values(0,?)");
    st.setString(1,paramMonth);
    st.execute();
    conn.commit();
    var record = [];
    record.push(paramMonth);
    output.data.push(record);
    conn.close();

	// call SAP Predictive Analytics Procedure
	query = "CALL \"GBI_005\".\"PAL_FORECAST_POLYNOMIALR_PROC\"(\"GBI_005\".\"PAL_FPR_PREDICTDATA_TBL\", \"GBI_005\".\"PAL_PR_RESULTS_TBL_" 
	      + paramSalesOrgIntKey + "_" + paramSalesOrgIntKey + "\", \"GBI_005\".\"PAL_CONTROL_TBL\", \"GBI_005\".\"PAL_FPR_FITTED_TBL\") with overview;";
	conn = $.db.getConnection();

	pstmt = conn.prepareCall(query);
	pstmt.execute();
	
    query = 'SELECT * FROM "GBI_005"."PAL_FPR_FITTED_TBL";';
	
	pstmt = conn.prepareStatement(query);
	rs = pstmt.executeQuery();
	
	rs.next();
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