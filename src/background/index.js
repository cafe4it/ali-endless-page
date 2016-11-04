import _ from 'lodash';
import chromeStorage from 'chrome-storage-wrapper';

const _AnalyticsCode = 'UA-74453743-3';
let service, tracker;

const PROMOTION_LINKS = [
    'http://s.click.aliexpress.com/e/I2biMfM3b', // Store:Junsun Official Store
    'http://s.click.aliexpress.com/e/I6M7m6Eq3', // Store:Teclast Official Store
    'http://s.click.aliexpress.com/e/YfaiMF6ei', // Store:BESDER Store
    'http://s.click.aliexpress.com/e/NVZNRJeEE', //
    'http://s.click.aliexpress.com/e/n2rRbyfEU', // Store:CAR TELO
    'http://s.click.aliexpress.com/e/YvB6QrjE2', // Store:Ever Pretty official store
    'http://s.click.aliexpress.com/e/auvZVNVzZ', // Store:Toyouth
    'http://s.click.aliexpress.com/e/qnYBAY7QB', // Store:SINOBI TIMER
    'http://s.click.aliexpress.com/e/6I6iIqnYN', // Store:Veri Gude Official Store
]

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
            if(tracker){
                tracker.sendEvent('App', 'Surf', msg.data || '');
            }
            break;
        case 'SEND_PROMOTION':
            chrome.storage.local.get('SEND_PROMOTION', function (result) {
                try{
                    let is_send = false
                    const _now = Date.now()
                    if(!result['SEND_PROMOTION']){
                        is_send = true
                    }else{
                        const _ago = new Date(result['SEND_PROMOTION'])
                        const over_days = daydiff(_ago, _now)
                        if(over_days >= 3){
                            is_send = true
                        }
                    }
                    if(is_send){
                        var promotion_link = PROMOTION_LINKS[Math.floor(Math.random() * PROMOTION_LINKS.length)]
                        chrome.tabs.create({
                            url: promotion_link
                        }, function () {
                            chrome.storage.local.set({['SEND_PROMOTION']: _now})
                            tracker.sendEvent('Promotion', 'Tab', promotion_link)
                        })
                    }
                }catch(ex){
                    console.log(ex)
                }

            })
            break;
    }
    return true;
})

function daydiff(first, second) {
    return Math.round((second-first)/(1000*60*60*24));
}