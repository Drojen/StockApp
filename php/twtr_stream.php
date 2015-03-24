<?php
/**
* 	Oauth.php
*
*	Created by Jon Hurlock on 2013-03-20.
* 	
*	Jon Hurlock's Twitter Application-only Authentication App by Jon Hurlock (@jonhurlock)
*	is licensed under a Creative Commons Attribution-ShareAlike 3.0 Unported License.
*	Permissions beyond the scope of this license may be available at http://www.jonhurlock.com/.
*/

include '../../../tokens.inc'; // get tokens from include -> COMSUMER_KEY and CONSUMER_SECRET

/**
*	Get the Bearer Token, this is an implementation of steps 1&2
*	from https://dev.twitter.com/docs/auth/application-only-auth
*/

function getAppToken(){
	if($_SESSION['twitter_bearer_token']) {
		// echo 'Token exists... used session token<br><br>';
		return $_SESSION['twitter_bearer_token'];
	} else {
		$encoded_consumer_key = urlencode(CONSUMER_KEY);
		$encoded_consumer_secret = urlencode(CONSUMER_SECRET);
		$bearer_token = $encoded_consumer_key.':'.$encoded_consumer_secret;
		$base64_encoded_bearer_token = base64_encode($bearer_token);
		$url = "https://api.twitter.com/oauth2/token"; // url to send data to for authentication
		$headers = array( 
			"POST /oauth2/token HTTP/1.1", 
			"Host: api.twitter.com", 
			"User-Agent: Twitter Application-only OAuth App v.1",
			"Authorization: Basic ".$base64_encoded_bearer_token,
			"Content-Type: application/x-www-form-urlencoded;charset=UTF-8"
		); 
	
		$ch = curl_init();  // setup a curl
		curl_setopt($ch, CURLOPT_URL,$url);  // set url to send to
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); // set custom headers
		curl_setopt($ch, CURLOPT_POST, 1); // send as post
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // return output
		curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials"); // post body/fields to be sent
		$header = curl_setopt($ch, CURLOPT_HEADER, 1); // send custom headers
		$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$retrievedhtml = curl_exec ($ch); // execute the curl
		curl_close($ch); // close the curl
		$output = explode("\n", $retrievedhtml);
		$bearer_token = '';
		foreach($output as $line)
		{
			if($line) {
				$bearer_token = $line;
			}
		}
		$bearer_token = json_decode($bearer_token);
		$_SESSION['twitter_bearer_token'] = $bearer_token->{'access_token'};
		// echo 'Had to request token from twitter... <br><br>';
		return $_SESSION['twitter_bearer_token'];
	}
}

// Should not have to use this....
function invalidateAppToken($bearer_token){
	$encoded_consumer_key = urlencode(CONSUMER_KEY);
	$encoded_consumer_secret = urlencode(CONSUMER_SECRET);
	$consumer_token = $encoded_consumer_key.':'.$encoded_consumer_secret;
	$base64_encoded_consumer_token = base64_encode($consumer_token);
	// step 2
	$url = "https://api.twitter.com/oauth2/invalidate_token"; // url to send data to for authentication
	$headers = array( 
		"POST /oauth2/invalidate_token HTTP/1.1", 
		"Host: api.twitter.com", 
		"User-Agent: jonhurlock Twitter Application-only OAuth App v.1",
		"Authorization: Basic ".$base64_encoded_consumer_token,
		"Accept: */*", 
		"Content-Type: application/x-www-form-urlencoded"
	); 
    
	$ch = curl_init();  // setup a curl
	curl_setopt($ch, CURLOPT_URL,$url);  // set url to send to
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); // set custom headers
	curl_setopt($ch, CURLOPT_POST, 1); // send as post
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // return output
	curl_setopt($ch, CURLOPT_POSTFIELDS, "access_token=".$bearer_token.""); // post body/fields to be sent
	$header = curl_setopt($ch, CURLOPT_HEADER, 1); // send custom headers
	$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$retrievedhtml = curl_exec ($ch); // execute the curl
	curl_close($ch); // close the curl
	return $retrievedhtml;
}

// twitter search API based on https://dev.twitter.com/docs/api/1.1/get/search/tweets
function searchAPI($bearer_token, $query, $result_type='mixed', $count='25'){
	$url = "https://api.twitter.com/1.1/search/tweets.json"; // base url
	$q = urlencode(trim($query.' -RT -penny -"sign up"')); // query term, exludes some strings
	$formed_url = '?q='.$q; // fully formed url
	if($result_type!='mixed'){$formed_url = $formed_url.'&result_type='.$result_type;} // result type - mixed(default), recent, popular
	if($count!='15'){$formed_url = $formed_url.'&count='.$count;} // results per page - defaulted to 15
	$formed_url = $formed_url.'&lang=en&include_entities=true'; // makes sure the entities are included, note @mentions are not included see documentation
	$headers = array( 
		"GET /1.1/search/tweets.json".$formed_url." HTTP/1.1", 
		"Host: api.twitter.com", 
		"User-Agent: jonhurlock Twitter Application-only OAuth App v.1",
		"Authorization: Bearer ".$bearer_token
	);
	$ch = curl_init();  // setup a curl
	curl_setopt($ch, CURLOPT_URL,$url.$formed_url);  // set url to send to
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); // set custom headers
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // return output
	$retrievedhtml = curl_exec ($ch); // execute the curl
	curl_close($ch); // close the curl
	return $retrievedhtml;
}

$search_term = $_GET["symbol"]; // get search symbol provided from analyzer
session_start();
$bearer_token = getAppToken(); // get the bearer token from session or new request, whichever is applicable
$json_returned = searchAPI($bearer_token, $search_term); // perform search 
session_write_close();
echo $json_returned; // return to ajax get request

?>
