exports.handler = async function (event) {
  const year = (event.queryStringParameters && event.queryStringParameters.year) || "2026";
  const apiUrl = "https://api-web.nhle.com/v1/playoff-bracket/" + year;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return { statusCode: 502, body: "NHL API returned " + response.status };
    }
    const data = await response.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      },
      body: data
    };
  } catch (err) {
    return { statusCode: 502, body: "Fetch failed: " + err.message };
  }
};

