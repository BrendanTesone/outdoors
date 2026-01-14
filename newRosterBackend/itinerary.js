/**
 * FINAL ITINERARY GENERATOR
 * Combines all modular steps to generate a professional Google Document.
 */
function generateItinerary(payload) {
    const url = payload.url;
    if (!url) return { error: "No URL provided" };

    try {
        // 1. Parse and Resolve
        const longUrl = followRedirect(url);
        const stopNames = extractStopsFromUrl(longUrl);
        if (!stopNames || stopNames.length < 2) return { error: "Could not identify enough stops in that URL." };

        const stops = stopNames.map(name => {
            const loc = resolveLocation(name);
            return { name: name, ...loc };
        });

        // 2. Create Document
        const doc = DocumentApp.create("TRIP ITINERARY - " + stopNames.join(" to ") + " - " + Utilities.formatDate(new Date(), "GMT-5", "MM/dd/yyyy"));
        const body = doc.getBody();
        body.setMarginTop(36).setMarginBottom(36).setMarginLeft(36).setMarginRight(36);

        // --- SECTION: DIRECTIONS ---
        body.appendParagraph("DIRECTIONS").setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setForegroundColor("#2c3e50");
        body.appendHorizontalRule();

        for (let i = 0; i < stops.length - 1; i++) {
            const start = stops[i];
            const end = stops[i + 1];

            const title = body.appendParagraph(`${start.name} → ${end.name}`);
            title.setHeading(DocumentApp.ParagraphHeading.HEADING2).setSpacingBefore(10).setForegroundColor("#333333");

            // Get live route
            const directions = Maps.newDirectionFinder()
                .setOrigin(start.name)
                .setDestination(end.name)
                .setMode(Maps.DirectionFinder.Mode.DRIVING)
                .getDirections();

            if (directions.routes && directions.routes.length > 0) {
                const route = directions.routes[0];
                const leg = route.legs[0];

                body.appendParagraph(`${leg.duration.text} (${leg.distance.text})`).setItalic(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

                // GPS ABOVE IMAGE
                const gps = `GPS: ${leg.start_location.lat.toFixed(6)}, ${leg.start_location.lng.toFixed(6)} → ${leg.end_location.lat.toFixed(6)}, ${leg.end_location.lng.toFixed(6)}`;
                body.appendParagraph(gps).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(9).setForegroundColor("#666666").setSpacingAfter(4);

                // Static Map Image
                const mapBlob = fetchStaticMap(route.overview_polyline.points,
                    { lat: leg.start_location.lat, lon: leg.start_location.lng },
                    { lat: leg.end_location.lat, lon: leg.end_location.lng });
                if (mapBlob) {
                    const img = body.appendImage(mapBlob);
                    // Maintain 600x350 aspect ratio (approx 1.71)
                    const targetWidth = 430;
                    const targetHeight = Math.round(targetWidth * (350 / 600)); // ~251
                    img.setWidth(targetWidth).setHeight(targetHeight).setAttributes({ [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER });
                }

                // Live Maps Link
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(start.name)}&destination=${encodeURIComponent(end.name)}&travelmode=driving`;
                const linkPara = body.appendParagraph("Open in Google Maps");
                linkPara.setLinkUrl(mapsUrl).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(9).setUnderline(true).setForegroundColor("#1a73e8");

            } else {
                body.appendParagraph("Route details unavailable for this leg.");
            }
            // Fit 2 legs per page
            if (i % 2 === 1 && i < stops.length - 2) {
                body.appendPageBreak();
            }
        }

        // --- SECTION: EMERGENCY PLANS ---
        body.appendPageBreak();
        body.appendParagraph("EMERGENCY PLANS").setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setForegroundColor("#2c3e50");
        body.appendHorizontalRule();

        // Generate plans for all stops except the very first departure point (unless it's a stop-over)
        for (let i = 1; i < stops.length; i++) {
            const dest = stops[i];
            if (!dest.lat || !dest.lon) continue;

            const stopItem = body.appendListItem(dest.name);
            stopItem.setNestingLevel(0).setBold(true).setFontSize(13).setForegroundColor("#2c3e50").setSpacingBefore(20);

            // const amenities = fetchAmenitiesOSM(dest.lat, dest.lon);
            const amenities = { hospitals: [], gas: [], mechanic: [] }; // Disabled for consistency
            const categories = [
                { label: "Medical", data: amenities.hospitals[0] },
                { label: "Gas", data: amenities.gas[0] },
                { label: "Auto Repair", data: amenities.mechanic[0] }
            ];

            categories.forEach(cat => {
                const catItem = body.appendListItem(cat.label);
                catItem.setNestingLevel(1).setBold(true).setFontSize(11).setForegroundColor("#333333").setSpacingBefore(5).setSpacingAfter(0);

                const d = cat.data || {};

                // Details (Nesting Level 2)
                const addDetail = (label, val, italic = false) => {
                    const text = label + ": " + (val || "");
                    const li = body.appendListItem(text);
                    li.setNestingLevel(2).setFontSize(9).setBold(false).setItalic(italic).setForegroundColor("#555555").setSpacingBefore(0).setSpacingAfter(0);
                };

                addDetail("Name", d.name === "Unknown Name" ? "" : d.name);
                addDetail("Address", d.address);
                addDetail("Hours", d.hours === "N/A" ? "" : d.hours);
                addDetail("Phone", d.phone === "N/A" ? "" : d.phone);
                addDetail("Distance", d.driveStats, true);
            });
        }

        return { success: true, docUrl: doc.getUrl(), docId: doc.getId() };

    } catch (e) {
        return { success: false, error: "Generation Failed: " + e.toString() };
    }
}

// 1. Test Location Resolution
function testResolveLocation(payload) {
    const query = payload.query;
    if (!query) return { error: "No query provided" };

    // Logic from previous resolveLocation
    const result = resolveLocation(query);
    if (result) {
        return { success: true, ...result };
    }
    return { success: false, error: "Could not find location" };
}

// 2. Test URL Parsing
function testExtractStops(payload) {
    const url = payload.url;
    if (!url) return { error: "No URL provided" };

    const longUrl = followRedirect(url);
    const stops = extractStopsFromUrl(longUrl);

    if (stops) {
        return { success: true, stops: stops, fullUrl: longUrl };
    }
    return { success: false, error: "Count not parse stops" };
}

// 3. Test Route & Map
function testRouteMap(payload) {
    const origin = payload.origin;
    const dest = payload.dest;

    if (!origin || !dest) return { error: "Missing origin or destination address" };

    try {
        // Fetch Route using strings directly
        const directions = Maps.newDirectionFinder()
            .setOrigin(origin)
            .setDestination(dest)
            .getDirections();

        if (directions && directions.routes && directions.routes.length > 0) {
            const leg = directions.routes[0].legs[0];
            const polyline = directions.routes[0].overview_polyline.points;

            // Get coords for markers from the route response itself
            // Google Directions API returns {lat, lng} objects
            const startLoc = { lat: leg.start_location.lat, lon: leg.start_location.lng };
            const endLoc = { lat: leg.end_location.lat, lon: leg.end_location.lng };

            // Generate Map Image
            const mapBlob = fetchStaticMap(polyline, startLoc, endLoc);
            const base64 = Utilities.base64Encode(mapBlob.getBytes());

            return {
                success: true,
                distance: leg.distance.text,
                duration: leg.duration.text,
                image: "data:image/png;base64," + base64
            };
        } else {
            return { success: false, error: "No route found between these addresses." };
        }
    } catch (e) {
        return { success: false, error: "Route Error: " + e.message };
    }
}

// 4. Test Amenities
function testAmenities(payload) {
    const query = payload.address || payload.query;
    if (!query) return { error: "No address or coordinates provided" };

    // Resolve address to coordinates first
    const location = resolveLocation(query);
    if (!location) return { success: false, error: "Could not resolve this address to coordinates." };

    const amenities = fetchAmenitiesOSM(location.lat, location.lon);
    return {
        success: true,
        location: location,
        data: amenities
    };
}


// --- SHARED HELPER FUNCTIONS ---

function resolveLocation(query) {
    // 1. Check for Direct Coordinates (e.g. "38.123, -78.123")
    const coordMatch = String(query).match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[3]), source: "Coordinates" };
    }

    // 2. Google Maps Geocoder (Built-in Apps Script Service)
    try {
        const response = Maps.newGeocoder().geocode(query);
        if (response.status === 'OK' && response.results.length > 0) {
            const result = response.results[0];
            const loc = result.geometry.location;
            return {
                lat: loc.lat,
                lon: loc.lng,
                source: "Google Maps Geocoder",
                formattedAddress: result.formatted_address
            };
        } else {
            console.warn("Geocoder failed for: " + query + " Status: " + response.status);
        }
    } catch (e) {
        console.error("Geocoding error for " + query, e);
    }

    return null;
}

function fetchRouteLeg(lat1, lon1, lat2, lon2) {
    try {
        const directions = Maps.newDirectionFinder()
            .setOrigin(lat1, lon1)
            .setDestination(lat2, lon2)
            .getDirections();

        if (directions && directions.routes && directions.routes.length > 0) {
            const leg = directions.routes[0].legs[0];
            return {
                distance: leg.distance.text,
                duration: leg.duration.text,
                polyline: directions.routes[0].overview_polyline.points
            };
        }
    } catch (e) {
        console.error("Directions check failed", e);
    }
    return null;
}

function fetchStaticMap(encodedPolyline, startLoc, endLoc) {
    try {
        const map = Maps.newStaticMap()
            .setSize(600, 350)
            .setLanguage('en')
            .setMobile(true);

        if (encodedPolyline) {
            map.addPath(Maps.decodePolyline(encodedPolyline));
        }

        map.addMarker(startLoc.lat, startLoc.lon);
        map.addMarker(endLoc.lat, endLoc.lon);

        return map.getBlob();
    } catch (e) {
        console.error("Static Map generation failed", e);
    }
    return null;
}

function populateDriveStats(origin, locations) {
    return locations.map(loc => {
        let stats = "calculating...";
        // Try Maps Service for accurate Drive Time
        try {
            const d = Maps.newDirectionFinder()
                .setOrigin(origin.lat, origin.lon)
                .setDestination(loc.lat, loc.lon)
                .getDirections();

            if (d.routes && d.routes.length > 0) {
                const leg = d.routes[0].legs[0];
                stats = `${leg.duration.text}/${leg.distance.text}`; // "22min/7.7mi"
            } else {
                throw new Error("No route");
            }
        } catch (e) {
            // Fallback to Crow-Flies if quota hit or no route
            const km = dist(origin.lat, origin.lon, loc.lat, loc.lon);
            stats = `~${km.toFixed(1)} km (Linear)`;
        }

        return { ...loc, driveStats: stats };
    });
}

/**
 * Fetches nearby Hospitals, Gas, and Mechanics quickly using an optimized single-query approach.
 */
function fetchAmenitiesOSM(lat, lon) {
    const radius = 25000;

    // 1. Optimized Combined Search (One API call for everything primary)
    const combinedQuery = `
        [out:json][timeout:15];
        (
            nwr["amenity"~"hospital|fuel|clinic|medical_center"](around:${radius},${lat},${lon});
            nwr["healthcare"="hospital"](around:${radius},${lat},${lon});
            nwr["shop"~"car_repair|tyres|auto_repair"](around:${radius},${lat},${lon});
            nwr["name"~"Gas|Station|Shell|Exxon|BP|Mobil|Sunoco|7-Eleven",i](around:${radius},${lat},${lon});
        );
        out center;
    `;

    try {
        const url = "https://overpass-api.de/api/interpreter";
        const resp = UrlFetchApp.fetch(url, { method: 'POST', payload: combinedQuery, muteHttpExceptions: true });

        if (resp.getResponseCode() !== 200) throw new Error("OSM Request Failed");

        const data = JSON.parse(resp.getContentText());
        const elements = data.elements || [];

        const hospitals = [];
        const gas = [];
        const mechanic = [];

        elements.forEach(el => {
            const tags = el.tags || {};
            const itemLat = el.lat || (el.center ? el.center.lat : null);
            const itemLon = el.lon || (el.center ? el.center.lon : null);
            if (!itemLat || !itemLon) return;

            const item = {
                name: tags.name || "Unknown Name",
                phone: tags.phone || tags['contact:phone'] || tags['phone:emergency'] || "N/A",
                address: (tags['addr:street'] ? tags['addr:street'] + " " : "") +
                    (tags['addr:city'] ? tags['addr:city'] + ", " : "") +
                    (tags['addr:state'] || ""),
                hours: tags.opening_hours || "N/A",
                lat: itemLat,
                lon: itemLon
            };

            // Categorize
            const type = (tags.amenity || "") + (tags.healthcare || "") + (tags.shop || "") + (tags.name || "");
            const typeLower = type.toLowerCase();

            if (typeLower.includes("hospital") || typeLower.includes("clinic") || typeLower.includes("medical")) {
                hospitals.push(item);
            } else if (tags.amenity === "fuel" || typeLower.includes("gas") || typeLower.includes("station")) {
                gas.push(item);
            } else if (typeLower.includes("repair") || typeLower.includes("tyre") || typeLower.includes("mechanic") || typeLower.includes("auto")) {
                mechanic.push(item);
            }
        });

        const qualitySort = (a, b) => {
            const aName = (a.name && a.name !== "Unknown Name") ? 1 : 0;
            const bName = (b.name && b.name !== "Unknown Name") ? 1 : 0;
            if (aName !== bName) return bName - aName;
            const aInfo = ((a.phone && a.phone !== "N/A") ? 1 : 0) + ((a.hours && a.hours !== "N/A") ? 1 : 0);
            const bInfo = ((b.phone && b.phone !== "N/A") ? 1 : 0) + ((b.hours && b.hours !== "N/A") ? 1 : 0);
            if (aInfo !== bInfo) return bInfo - aInfo;
            return dist(lat, lon, a.lat, a.lon) - dist(lat, lon, b.lat, b.lon);
        };

        const filterBad = (list) => {
            const good = list.filter(item => item.name && item.name !== "Unknown Name");
            return good.length > 0 ? good : list;
        };

        return {
            hospitals: populateDriveStats({ lat: lat, lon: lon }, filterBad(hospitals).sort(qualitySort).slice(0, 3)),
            gas: populateDriveStats({ lat: lat, lon: lon }, filterBad(gas).sort(qualitySort).slice(0, 2)),
            mechanic: populateDriveStats({ lat: lat, lon: lon }, filterBad(mechanic).sort(qualitySort).slice(0, 2))
        };
    } catch (e) {
        console.warn("Fast Search failed, yielding empty: " + e.message);
        return { hospitals: [], gas: [], mechanic: [] };
    }
}


function dist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function followRedirect(url) {
    const response = UrlFetchApp.fetch(url, { followRedirects: false, muteHttpExceptions: true });
    const header = response.getHeaders();
    if (response.getResponseCode() >= 300 && response.getResponseCode() < 400 && header['Location']) {
        return followRedirect(header['Location']);
    }
    return url;
}

function extractStopsFromUrl(url) {
    try {
        const dirMatch = url.match(/\/dir\/(.+?)(\/@|\?$|$)/);
        if (!dirMatch) return null;
        return dirMatch[1].split('/').map(s => decodeURIComponent(s.replace(/\+/g, ' '))).filter(s => s.trim().length > 0);
    } catch (e) { return null; }
}
