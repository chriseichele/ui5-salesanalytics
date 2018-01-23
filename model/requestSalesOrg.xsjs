/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    Copyright (c) 2016 SAP UCC Magdeburg.
    All rights reserved.
    Contact: hana@ucc.ovgu.de

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

function createEntryOrg(rs) {
	return {
	    'type': 'Feature',
		'id': rs.getString(1),
		'properties':  {'state': rs.getString(2)} ,
		'geometry':  JSON.parse(rs.getString(3))
	};
}

var query = 'SELECT SALESORGANISATION, AREA, SHAPE.ST_ASGeoJson()' +
		    'FROM "GBI_DEMO"."GBI_DEMO_SALESORG_GPS"';

try {
	var conn = $.db.getConnection();
	var pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();
	var fCollection = {'type': "FeatureCollection"};
	fCollection.features = [];
	
	while(rs.next()) {
		fCollection.features.push(createEntryOrg(rs));
	}
	
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