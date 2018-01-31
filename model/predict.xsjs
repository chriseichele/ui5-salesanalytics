function createEntryOrg(rs) {
	return {
	    'type': 'Feature',
		'id': "SO" + rs.getInteger(1),
		'value':  rs.getDouble(2)
		};
}

var param1 = $.request.parameters.get('year');
var param2 = $.request.parameters.get('month');
var param3_Strg = $.request.parameters.get('sales_org');
var param4_Strg = $.request.parameters.get('product_group');

try {
    var conn = $.db.getConnection();
    var query = 'SELECT DISTINCT "PRODUCT_GROUP_MAPPED" FROM "_SYS_BIC"."gbi-student-006.SalesDataAnalytics.data/SALES_ALL" WHERE "PRODUCT_GROUP" = \''+ param4_Strg + '\';';
	
	var pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();
	
	rs.next();
	var param4 = rs.getInteger(1)+"";
	
    query = 'SELECT DISTINCT "SALES_ORG_MAPPED" FROM "_SYS_BIC"."gbi-student-006.SalesDataAnalytics.data/SALES_ALL" WHERE "SALES_ORGANISATION" = \''+ param3_Strg + '\';';
	
	pstmt = conn.prepareStatement(query);
	rs = pstmt.executeQuery();

	rs.next();
	var param3 = rs.getInteger(1)+"";
	
} catch(e) {
	$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	$.response.setBody("ERROR while catch" + e.message);
}

try {
    conn = $.db.getConnection();

	pstmt = conn.prepareStatement("DELETE FROM \"GBI_005\".\"PAL_FER_PREDICTDATA_TBL\";");
	pstmt.execute();
	conn.commit();
	pstmt.close();
	conn.close();
	
	
    var output = {};
    output.data = [];
    conn = $.db.getConnection();
    conn.prepareStatement("SET SCHEMA \"GBI_005\"").execute();
    var st = conn.prepareStatement("INSERT INTO \"PAL_FER_PREDICTDATA_TBL\" values(0,?,?,?,?)");
    st.setString(1,param1);
    st.setString(2,param2);
    st.setString(3,param3);
    st.setString(4,param4);
    st.execute();
    conn.commit();
    var record = [];
    record.push(param1);
    record.push(param2);
    record.push(param3);
    record.push(param4);
    output.data.push(record);
    conn.close();

	query = "CALL \"GBI_005\".\"PAL_FORECAST_EXPR_PROC\"(\"GBI_005\".\"PAL_FER_PREDICTDATA_TBL\", \"GBI_005\".\"PAL_ER_RESULTS_TBL\", \"GBI_005\".\"PAL_CONTROL_TBL\", \"GBI_005\".\"PAL_FER_FITTED_TBL\") with overview;";
	conn = $.db.getConnection();

	pstmt = conn.prepareCall(query);
	pstmt.execute();
	
    query = 'SELECT * FROM "GBI_005"."PAL_FER_FITTED_TBL";';
	
	pstmt = conn.prepareStatement(query);
	rs = pstmt.executeQuery();
	
	rs.next();
	var result = rs.getDouble(2);

	rs.close();
	pstmt.close();
	conn.close();
	
	$.response.contentType = "application/json";
	$.response.headers.set("access-control-allow-origin", "*");
	$.response.setBody(result);
	$.response.status = $.net.http.OK;
} catch(e) {
	$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	$.response.setBody("ERROR while catch" + e.message);
}