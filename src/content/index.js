import _ from 'lodash';
import './index.css';

var pagination_bottom = document.getElementById('pagination-bottom');
var gallery_item = document.getElementById('gallery-item');

if (pagination_bottom) {
    var currentPage = document.getElementsByClassName('ui-pagination-active')[0];
    if (currentPage) {
        var div = document.createElement('div');
        div.id = 'Load-More-Container';
        var btnLoadMore = document.createElement('button');
        btnLoadMore.id = "btnLoadMore";
        btnLoadMore.innerHTML = chrome.i18n.getMessage('button_LoadMore');
        btnLoadMore.className = 'ui-button ui-button-normal ui-button-primary';
        div.appendChild(btnLoadMore);
        var nextPage = currentPage.nextElementSibling;
        if (nextPage && $(nextPage).is('a')) {
            pagination_bottom.parentNode.insertBefore(div, pagination_bottom);
            $(btnLoadMore).on('click', function () {
                var nextPageUrl = nextPage.href || nextPage.getAttribute('href');
                chrome.runtime.sendMessage({
                    action : 'GET_NEXT_PAGE',
                    data : nextPageUrl
                });
            })
        }
    }

}

chrome.runtime.onMessage.addListener(function (msg, sender, response) {
    if (!msg.action) return;
    switch (msg.action){
        case 'ADD_MORE_ITEMS':
            var div = document.createElement('div');
            div.innerHTML = msg.data;
            var gallery_item = document.getElementById('gallery-item');
            if(gallery_item) gallery_item.appendChild(div.childNodes[0]);
            break;
    }
})