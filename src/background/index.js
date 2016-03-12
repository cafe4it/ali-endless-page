import _ from 'lodash';


chrome.runtime.onMessage.addListener(function (msg, sender, response) {
    if (!msg.action) return;
    var tabId = sender.tab.id;
    switch (msg.action) {
        case 'GET_NEXT_PAGE':
            var myWorker = new Worker(chrome.runtime.getURL('shared/worker.js'));
            myWorker.onmessage = function (rs) {
                var html = rs.data;
                var dom =  document.implementation.createHTMLDocument("dummyHTML");
                dom.documentElement.innerHTML = html;
                var list_items = dom.documentElement.querySelector('#list-items');
                if (list_items) {
                    chrome.tabs.sendMessage(tabId, {
                        action : 'ADD_MORE_ITEMS',
                        data : list_items.outerHTML
                    })
                }
            }

            myWorker.postMessage(msg.data);
            break;
    }
})