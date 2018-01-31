var param3_Strg = $.request.parameters.get('sales_org');
var param4_Strg = $.request.parameters.get('product_group');

try {
    var conn = $.db.getConnection();
    var query = 'SELECT DISTINCT "PRODUCT_GROUP_MAPPED" FROM "_SYS_BIC"."gbi-student-006.SalesDataAnalytics.data/SALES_ALL" WHERE "PRODUCT_GROUP" = \''+ param4_Strg + '\';';
	
	var pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();
	
	rs.next();
	var param3 = rs.getInteger(1);
	
    query = 'SELECT DISTINCT "SALES_ORG_MAPPED" FROM "_SYS_BIC"."gbi-student-006.SalesDataAnalytics.data/SALES_ALL" WHERE "SALES_ORGANISATION" = \''+ param3_Strg + '\';';
	
	pstmt = conn.prepareStatement(query);
	rs = pstmt.executeQuery();

	rs.next();
	var param4 = rs.getInteger(1);
	
	$.response.contentType = "application/json";
	$.response.headers.set("access-control-allow-origin", "*");
	$.response.setBody(param4);
	$.response.status = $.net.http.OK;
} catch(e) {
	$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	$.response.setBody("ERROR while catch" + e.message);
}