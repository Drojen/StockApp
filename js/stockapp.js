/* global angular STWT */

// StockApp to be named
(function() {
    
    var StockApp = angular.module('StockApp', ['ngRoute']);
    
    /* NAVIGATION CONTROLLER for navbar links TURN THIS OFF
    StockApp.controller('NavigationCtrl', function($scope, $location) {
      this.isActive = function(route) {
        $scope.path = $location.path();
        return $location.path() === route;
      };
    });
    */
    
    // YAHOO FINANCE SERVICE
    StockApp.factory('YahooFinanceService', function($http, $q) {
        var ENDPOINT = "https://query.yahooapis.com/v1/public/yql";
        var query1 = "?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(%27"; // the search symbol goes in the middle
        var query2 = "%27)&format=json&diagnostics=true&env=http://datatables.org/alltables.env"; // of these two queries
        
        return {
            getData: function(symbol) {
              return $http.get(ENDPOINT + query1 + symbol + query2)
                .then(function(result) { // success
                  if (typeof result === 'object') {
                    return result.data.query.results.quote; // good result
                  } else {
                    return $q.reject(result.data); // invalid result
                  }
              }, function(result) { // something went wrong
                  return $q.reject(result.data);
            });
          }
        };
    });
    
    // TWITTER FEED SERVICE
    StockApp.factory('TwitterService', function($http, $q) {
        var ENDPOINT = "../stockorithm/php/twtr_stream.php?symbol=$";
        
        return {
            getData: function(symbol) {
              return $http.get(ENDPOINT + symbol)
                .then(function(result) { // success
                  if (typeof result === 'object') {
                    return result.data.statuses; // good result
                  } else {
                    return $q.reject(result.data); // invalid result
                  }
              }, function(result) { // something went wrong
                  return $q.reject(result.data);
            });
          }
        };
    });
    
    // QUANDL WIKI SERVICE
    /* Port to PHP for token use when needed
    StockApp.factory('QuandlWikiService', function($http, $q) {
        var ENDPOINT = "https://www.quandl.com/api/v1/datasets/WIKI/";                          // symbol goes in between here...
        var query = ".json?column=4&sort_order=asc&collapse=quarterly&trim_start=2013-01-01";   // ...and here
        var token = "&auth_token=" + QUANDL_TOKEN; 
        
        return {
            getData: function(symbol) {
              return $http.get(ENDPOINT + symbol + query + token)
                .then(function(result) { // success
                  if (typeof result === 'object') {
                    return result.data; // good result
                  } else {
                    return $q.reject(result.data); // invalid result
                  }
              }, function(result) { // something went wrong
                  return $q.reject(result.data);
            });
          }
        };
    });
    */
    
    // QUANDL SEARCH SERVICE
    StockApp.factory('QuandlSearchService', function($http, $q) {
        var ENDPOINT = "../stockorithm/php/quandl.php?symbol=$";
        
        return {
            getData: function(symbol) {
              return $http.get(ENDPOINT + symbol)
                .then(function(result) { // success
                  if (typeof result === 'object') {
                    return result.data; // good result
                  } else {
                    return $q.reject(result.data); // invalid result
                  }
              }, function(result) { // something went wrong
                  return $q.reject(result.data);
            });
          }
        };
    });
    
    
    /* THE CHART THAT WON'T PLAY NICE
    StockApp.directive('graph', function() {
        return {
          restrict: "EA",
          templateUrl: 'templates/chart.html',
          replace: true,
        };
    });
    */
    
    // ANALYZER CONTROLLER
    StockApp.controller('AnalyzeCtrl', function($scope, $rootScope, $location, YahooFinanceService, QuandlSearchService, TwitterService) {

        var analyze = this;                     // analyze is set up as our alias for AnalyzeCtrl by $routeProvider
        analyze.strippedSymbol = "";            // search value, sanitized by stripString()
        analyze.searchListing = [];             // array of objects containing possible symbols from search
        analyze.yahoo = {};                     // yahoo real time quote json
        analyze.quandl = {};                    // quandl quote json
        analyze.quandlSearch = {};              // quandl quote search json
        analyze.twitterFeed = [];               // twitter feed json
        analyze.yahooFinanceSuccess = false;    // yahoo service success
        analyze.quandlWikiSuccess = false;      // quandl service success
        analyze.quandlSearchSuccess = false;    // quandl search success
        analyze.showAnalysis = false;           // check if there is something to show
        analyze.niceName = "";                  // nice looking name instead of truncated Yahoo one
        analyze.industry = "";                  // company industry category
        analyze.sector = "";                    // company market sector
        analyze.displaySymbol = "";             // used only for display flashing
        analyze.showSearchListHTML = false;     // bool value for showing/hiding search results
        
        // DOM targets
        var _symbol = $('#symbol');             // the actual search input box the user uses
        var _form = $('#stock-search-form');    // the wrapping form around the search input
        var _wrapper = $('#price-wrapper');     // the wrapper for price change info (green or red)
        var _glyph = $('#price-glyph');         // the up arrow or down arrow preceeding the price change info
        
        // PRIVATE FUNCTIONS =======================================================================================================
        
        function toggleDisabled() {
          $(_symbol).prop("disabled",!$(_symbol).prop("disabled"));
        }
        
        function stripString(str) {
          var stripped = str.replace(/[ ]+/gi, '+');   // change spaces to +
          stripped = stripped.replace(/[^\w.+-]+/gi, ''); // don't let them use anything but word characters and . or -
          return stripped.replace(/[_]+/gi, ''); // take out _
        }
        
        function setPriceStyles(num) {
          // remove all classes
          $(_wrapper).removeClass();
          $(_glyph).removeClass();
          
          // apply positive or negative styles
          if (num < 0) {
            $(_wrapper).addClass('negative');
            $(_glyph).addClass('glyphicon glyphicon-arrow-down size-glyph');
          } else {
            $(_wrapper).addClass('positive');
            $(_glyph).addClass('glyphicon glyphicon-arrow-up size-glyph');
          }
        }
        
        function tryItSearch() {
          
              analyze.strippedSymbol = stripString(analyze.originalSymbol); // format for search and conversion
              analyze.strippedSymbol = analyze.strippedSymbol.toUpperCase();
              
              $(_symbol).val('Searching...');
              toggleDisabled();
              stockLookup();
        }
        
        function searchSuccess() {
          analyze.displaySymbol = analyze.strippedSymbol;
          setPriceStyles(Number(stripString(analyze.yahoo.PercentChange))); // to set arrows and green/red color
        }
        
        function searchFailure() {
          $(_symbol).val('Symbol not Found: "' + analyze.originalSymbol + '"');
          $(_form).addClass('has-error');
        }
        
        function checkComplete() {
           // makes sure all searches are successfull
           if(dataExists()) {
             searchSuccess();
           } else {
             searchFailure();
           }
        }
        
        function dataExists() { // makes sure there is something to show
          analyze.showAnalysis = (analyze.yahoo.LastTradePriceOnly > 0) ? true : false;
          return analyze.showAnalysis;
        }
        
        function fixName(name) { // makes name consistent
          var sliceIndex = name.indexOf("(");
          if (sliceIndex > -1) {
            name = name.slice(0, sliceIndex);
          }
          return name;
        }
        
        function addToSearchList(obj, symbol, exchange) {
          var list = analyze.searchListing;
          var len = list.length;
          var entry = {};
          entry.symbol = symbol;
          entry.name = fixName(obj.name);
          entry.exchange = exchange;
          var duplicate = false;

          for (var i = 0; i < len; i++) {
            var check = list[i];
            if (symbol === check.symbol) { // found dupe
              duplicate = true;
              break;
            }
          }
          if (!duplicate || len === 0) { // add if it's not a dupe or there are no entries
            var year = new Date();
            year = year.getFullYear();
            if(obj.to_date.slice(0, 4) < year) {
              // do nothing
            } else {
              list.push(entry);
            }
          }
        }
        
        function showSearchList() {
          // console.log(analyze.searchListing);
          // code to show a list in a div
          if(analyze.searchListing.length < 1) {
            searchFailure();
          } else if (analyze.searchListing.length === 1) {
            analyze.pickSearchList(analyze.searchListing[0]);
          } else {
            $(_symbol).val('Please choose a result...');
            analyze.showSearchListHTML = true;
          }
        }
        
        function clearSearchListing() {
          while(analyze.searchListing.length > 0) {
              analyze.searchListing.pop();
          }
        }
        
        function stockLookup() {
          // clear out any old searches
          clearSearchListing();
          // Quandl Search to take search string and get correct stock symbol, then call function to get symbol metrics
          QuandlSearchService.getData(analyze.strippedSymbol)
            .then(function(data) { // success 
              analyze.quandlSearch = data;
              // console.log(analyze.quandlSearch);
              var resultsArr = analyze.quandlSearch.docs;
              var len = resultsArr.length;
              
              // search Quandl GOOG results
              for(var i = 0; i < len; i++) {
                var sliceIndex = resultsArr[i].code.search("_");
                var exchange = resultsArr[i].code.slice(0, sliceIndex);
                var tempSymbol = resultsArr[i].code.slice(sliceIndex + 1);
                var goodExchange = (exchange == "NYSE" || exchange == "NASDAQ") ? true : false;
                
                if (goodExchange) {
                  addToSearchList(resultsArr[i], tempSymbol, exchange);
                }
              }
              toggleDisabled();
              showSearchList();
              
            }, function(error) { // failure
              console.log('Http Error: ', error);
              analyze.quandlSearchSuccess = false;
            });
        }
        
        function getStockData() {
          // Yahoo Finance --- for up to the minute data
          YahooFinanceService.getData(stripString(analyze.strippedSymbol))
            .then(function(data) {  
              analyze.yahoo = data;
              // console.log(analyze.yahoo);
              analyze.yahooFinanceSuccess = true;
              checkComplete();
            }, function(error) {
              console.log('Http Error: ', error);
              analyze.yahooFinanceSuccess = false;
              checkComplete();
            });
            
          // get twitter feed
          TwitterService.getData(analyze.strippedSymbol)
            .then(function(data) {  
              analyze.twitterFeed = data;
              // console.log(analyze.twitterFeed);
            }, function(error) {
              console.log('Http Error: ', error);
            });   
          
          // call stock twits widget
          var STWTsettings = {
            container: 'stocktwits-widget-news',
            symbol: '',
            width: '305',
            height: '300', limit: '15',
            scrollbars: 'true', streaming: 'true',
            header: 0, 
            style: {link_color: '4871a8', link_hover_color: '4871a8', header_text_color: '000000', border_color: 'cecece', divider_color: 'cecece', divider_type: 'solid', box_color: 'f5f5f5', stream_color: 'ffffff', text_color: '000000', time_color: '999999'}
          };
          
          STWTsettings.symbol = analyze.strippedSymbol;
          STWTsettings.title = analyze.strippedSymbol + ' Tweets';
          $('#stocktwits-widget-news').html("");
          STWT.Widget(STWTsettings);
            
        }
        
        // PUBLIC (DIRECTIVE) FUNCTIONS =======================================================================================================
        
        // Clears symbol search on click
        analyze.clearInput = function() {
          if ($(_symbol).val !== undefined) {
            $(_symbol).val('');
            $(_form).removeClass('has-error has-success');
          }
          analyze.showSearchListHTML = false;
        };
        
        analyze.pickSearchList = function(item) { // code for what happens when you pick one from searchList
          analyze.strippedSymbol = item.symbol;
          analyze.niceName = item.name;
          getStockData();
          analyze.clearInput();
        };
        
        // GETS QUANDL SEARCH RESULTS
        analyze.getStock = function() {
          
          analyze.originalSymbol = $scope.symbol; // save for display
          analyze.strippedSymbol = stripString($scope.symbol); // format for search and conversion
          analyze.strippedSymbol = analyze.strippedSymbol.toUpperCase();
          $(_symbol).val('Searching...');
          toggleDisabled();
          stockLookup();

        };
        
    }); // END AnalyzeCtrl
    
 
})();