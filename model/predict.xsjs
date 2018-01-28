
function createEntryOrg(rs) {
	return {
	    'type': 'Feature',
		'id': "SO" + rs.getInteger(1),
		'value':  rs.getDouble(2)
		};
}

var param1 = $.request.parameters.get('year');
var param2 = $.request.parameters.get('month');
var param3 = $.request.parameters.get('sales_org');
var param4 = $.request.parameters.get('product_group');

try {
    var conn = $.db.getConnection();

	var pstmt = conn.prepareStatement("DELETE FROM \"GBI_005\".\"PAL_FMLR_PREDICTDATA_TBL\";");
	pstmt.execute();
	conn.commit();
	pstmt.close();
	conn.close();
	
	
    var output = {};
    output.data = [];
    conn = $.db.getConnection();
    conn.prepareStatement("SET SCHEMA \"GBI_005\"").execute();
    var st = conn.prepareStatement("INSERT INTO \"PAL_FMLR_PREDICTDATA_TBL\" values(0,?,?,?,?,1)");
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

	var query = "CALL \"GBI_005\".\"PAL_FORECAST_LR_PROC\"(\"GBI_005\".\"PAL_FMLR_PREDICTDATA_TBL\", \"GBI_005\".\"PAL_MLR_RESULTS_TBL\", \"GBI_005\".\"PAL_CONTROL_TBL\", \"GBI_005\".\"PAL_FMLR_FITTED_TBL\") with overview;";
	conn = $.db.getConnection();

	pstmt = conn.prepareCall(query);
	pstmt.execute();
	
    query = 'SELECT * FROM "GBI_005"."PAL_FMLR_FITTED_TBL";';
	
	pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();
	
	/*var fCollection = {'type': "FeatureCollection"};
	fCollection.features = [];
	
	while(rs.next()) {
		fCollection.features.push(createEntryOrg(rs));
	}*/
	
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