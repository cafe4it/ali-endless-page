import _ from 'lodash';
import chromeStorage from 'chrome-storage-wrapper';

const _AnalyticsCode = 'UA-74453743-3';
let service, tracker;

var importScript = (function (oHead) {
    //window.analytics = analytics;
    function loadError(oError) {
        throw new URIError("The script " + oError.target.src + " is not accessible.");
    }

    return function (sSrc, fOnload) {
        var oScript = document.createElement("script");
        oScript.type = "text\/javascript";
        oScript.onerror = loadError;
        if (fOnload) {
            oScript.onload = fOnload;
        }
        oHead.appendChild(oScript);
        oScript.src = sSrc;
    }

})(document.head || document.getElementsByTagName("head")[0]);

importScript(chrome.runtime.getURL('shared/google-analytics-bundle.js'), function () {
    console.info('google analytics platform loaded...');
    service = analytics.getService('aliexpress_endless_page');
    tracker = service.getTracker(_AnalyticsCode);
    tracker.sendAppView('App view');
});

chromeStorage.defaultArea = 'local';

chromeStorage.get(['cfgLoadMore'])
    .then(items => {
        if(!items.cfgLoadMore || items.cfgLoadMore === null){
            chromeStorage.set('cfgLoadMore','manual')
        }
    });

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg.action) return;
    var tabId = sender.tab.id;
    switch (msg.action) {
        case 'GET_NEXT_PAGE':
            var myWorker = new Worker(chrome.runtime.getURL('shared/worker.js'));
            myWorker.onmessage = function (rs) {
                var html = rs.data;
                var dom =  document.implementation.createHTMLDocument("dummyHTML");
                dom.documentElement.innerHTML = html;
                var list_items = dom.documentElement.querySelector('div.list-items, #list-items, .items-list');
                var pagination_bottom = dom.documentElement.querySelector('#pagination-bottom');
                if (list_items && pagination_bottom) {
                    //console.warn(list_items.children[0])
                    chrome.tabs.sendMessage(tabId, {
                        action : 'ADD_MORE_ITEMS',
                        data : {
                            list_items : (list_items.nodeName !== 'UL')? list_items.children[0].outerHTML : list_items.outerHTML,
                            pagination_bottom : pagination_bottom.innerHTML
                        }
                    },function(response){
                        sendResponse(response);
                        myWorker.terminate()
                    })
                }
            }

            myWorker.postMessage(msg.data);
            break;
        case 'SHOW_PAGE_ACTION' :
            chrome.pageAction.show(tabId);
            break;
    }
    return true;
})

function getParameterByName(name, url) {
	if (!url) {
		url = window.location.href;
	}
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function open_link_in_new_tab(is_promotion, _href, is_active, _now, action_label, action_value, isUpdate, tabId) {
	if (is_promotion) {
		chrome.cookies.remove({
			url: "http://aliexpress.com",
			name: "aep_usuc_f"
		}, function (rs) {
			if(isUpdate && tabId){
				chrome.tabs.update(tabId, {
					url: _href,
					active: is_active
				}, () => {
					const _value = action_value || _href + ' | ' + new Date(_now).toString()
					tracker.sendEvent('Chrome', action_label, _value)
				})
			}else{
				chrome.tabs.create({
					url: _href,
					active: is_active
				}, () => {
					const _value = action_value || _href + ' | ' + new Date(_now).toString()
					tracker.sendEvent('Chrome', action_label, _value)
				})
			}

		});
	} else {
		chrome.tabs.create({
			url: _href,
			active: is_active
		})
	}
}

function check_session_valid(sessionName, _hours, cb) {
	const _1hour = 1000 * 60 * 60
	// const _15minutes = _1hour / 4
	let is_valid = false
	chrome.storage.sync.get([sessionName], function (result) {
		const _now = Date.now()
		let _SESSI0N_ = result[sessionName]
		if (!_SESSI0N_) {
			is_valid = true
		} else {
			is_valid = ((_now - _SESSI0N_) / _1hour) >= _hours
		}
		cb(is_valid, sessionName, _now)
	})
}

const SKS = ['UrNZRbY', 'uvrVJEu', 'j2rFimM', 'FY3naIE', 'N7eUfIu', 'FamiEaa']
const OVERRIDE_SK = 'FamiEaa'
const promotion_uri_tpl = _.template('http://s.click.aliexpress.com/deep_link.htm?aff_short_key=<%=sk%>&dl_target_url=<%=uri%>')

chrome.webRequest.onCompleted.addListener(function (detail) {
	try {
		if (detail.frameId >= 0 && detail.tabId >= 0 && detail.type === 'main_frame') {
			const sk = getParameterByName('sk', detail.url)
			const requestUrl = detail.url.split('?')[0] || detail.url
			if(sk != null && SKS.indexOf(sk) === -1){
				const _now = Date.now()
				chrome.storage.sync.set({
					_SESSI0N_: _now
				})
				const _href = promotion_uri_tpl({uri: encodeURI(requestUrl), sk: OVERRIDE_SK})
				open_link_in_new_tab(true, _href, false, _now, 'ThankYou Again', requestUrl, true, detail.tabId)
			}else{
				if(detail.url.match(/\/product\/|\/item\//) !== null){
					check_session_valid('_SESSI0N_', 2 , function (is_valid, sessionName, _now) {
						if(is_valid){
							chrome.storage.sync.set({
								[sessionName]: _now
							})
							const _href = promotion_uri_tpl({uri: encodeURI(requestUrl), sk: OVERRIDE_SK})
							open_link_in_new_tab(true, _href, false, _now, 'ThankYou', requestUrl, true, detail.tabId)
						}
					})
				}
			}
		}
	} catch (ex) {

	}
}, {urls: ['*://*.aliexpress.com/*']})
