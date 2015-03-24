<?php

// Simple Quandl search API interface using cURL
// pulls 10 results, returns JSON

include '../../../tokens.inc'; // QUANDL_TOKEN is what we need here

function QuandlSearchAPI($query){

    // construct url
	$url = "https://www.quandl.com/api/v1/datasets.json?query="; // base url
	$urlOptions = "&source_code=GOOG&per_page=10&auth_token=".QUANDL_TOKEN;
	$q = urlencode($query); 
	$formed_url = $url.$q.$urlOptions; // fully formed url
    
    // cURL
	$ch = curl_init();  // setup a curl
	curl_setopt($ch, CURLOPT_URL,$formed_url); // set url to send to
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // return output
	$retrievedhtml = curl_exec ($ch); // execute the curl
	curl_close($ch); // close the curl
	return $retrievedhtml;
}

$symbol = $_GET["symbol"]; // get search symbol provided from analyzer

echo QuandlSearchAPI($symbol);

?>