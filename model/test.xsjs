
function createEntryOrg(rs) {
	return {
	    'type': 'Feature',
		'id': "SO" + rs.getInteger(1),
		'value':  rs.getDouble(2)
		};
}

var param1 = $.request.parameters.get('num1');

var query = 'CALL "GBI_005"."PAL_FORECAST_LR_PROC"("GBI_005"."PAL_FMLR_PREDICTDATA_TBL", "GBI_005"."PAL_MLR_RESULTS_TBL", "GBI_005"."PAL_CONTROL_TBL", "GBI_005"."PAL_FMLR_FITTED_TBL") with overview;';
try {
	var conn = $.db.getConnection();
	var pstmt = conn.prepareCall(query);
	pstmt.execute();
	
    query = 'SELECT * FROM "GBI_005"."PAL_FMLR_FITTED_TBL";';
	
	pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();

	var fCollection = {'type': "FeatureCollection"};
	fCollection.features = [];
	
	while(rs.next()) {
		fCollection.features.push(createEntryOrg(rs));
	}
	
	var result = rs;

	rs.close();
	pstmt.close();
	conn.close();
	
	$.response.contentType = "application/json";
	$.response.headers.set("access-control-allow-origin", "*");
	$.response.setBody(JSON.stringify(fCollection));
	$.response.status = $.net.http.OK;
} catch(e) {
	$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	$.response.setBody("ERROR while catch" + e.message);
}