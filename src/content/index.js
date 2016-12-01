import _ from 'lodash';
import chromeStorage from 'chrome-storage-wrapper';
import './index.css';

chromeStorage.addChangeListener((changes, area) => {
    changeConfigLoadMore(changes.cfgLoadMore);
}, {
    keys:['cfgLoadMore'], // optional, String or Array of String. Which keys you want listen.
    areas:['local'] // optional, String or Array of String. Which storage areas you want listen.
} ); // Only listen the change from 'key2' and chrome.storage.local


var pagination_bottom = undefined;
var list_items = undefined;
var last_item = undefined;
var currentPage = undefined;
var nextPage = undefined;
var hasNextPage = false;
const totalItems = getTotalItems();
var loadedItems = 0;


const icon_loading = require('../icons/loading.gif');

function getTotalItems(){
    var resultCount = document.querySelector('strong.search-count, #result-info > strong'),
        _totalItems = (resultCount) ? resultCount.innerHTML : '0,0',
        _totalItems = parseInt(_.replace(_totalItems, ',', ''));
    return _totalItems;
}

function initVars() {
    pagination_bottom = document.getElementById('pagination-bottom');
    list_items = document.querySelector('.list-items, #list-items, .items-list');
    currentPage = document.getElementsByClassName('ui-pagination-active')[0];
    if (currentPage) {
        nextPage = currentPage.nextElementSibling;
        hasNextPage = $(nextPage).is('a');
    }
    if (list_items) {

        var ul_li_item = document.querySelectorAll('li.list-item, li.item');
        loadedItems = ul_li_item.length || 0;
        last_item = _.last(ul_li_item);

        //console.log(totalItems, loadedItems);
    }
}

function changeConfigLoadMore(cfg){
    if(cfg === 'auto'){
        $('#btnLoadMore').addClass('notShow');
        $(window).scroll(autoLoadMore);
        autoLoadMore();
    }else if(cfg === 'manual'){
        $(window).unbind('scroll');
        $('#btnLoadMore').removeClass('notShow');
    }
}

function autoLoadMore(){
    var window_top = $(window).scrollTop();
    var lastItem_top = $(last_item).offset().top;
    //console.info(window_top, lastItem_top)
    if((lastItem_top - window_top) < 300 ){

        if(loadedItems >= totalItems) return;
        $('#btnLoadMore').click();
    }
}

initVars();
//console.log(gallery_item, list_items);
if (list_items && pagination_bottom && currentPage && nextPage && hasNextPage) {
    chrome.runtime.sendMessage({
        action : 'SHOW_PAGE_ACTION',
        data : window.location.href
    });

    var div = document.createElement('div');
    div.id = 'Load-More-Container';
    var btnLoadMore = document.createElement('button');
    btnLoadMore.id = "btnLoadMore";
    btnLoadMore.innerHTML = chrome.i18n.getMessage('button_LoadMore');
    btnLoadMore.className = 'ui-button ui-button-normal ui-button-medium';

    chromeStorage.get(['cfgLoadMore'])
        .then(items => {
            var cfgLoadMore = items.cfgLoadMore;
            changeConfigLoadMore(cfgLoadMore);
        });

    div.appendChild(btnLoadMore);

    var loadingBar = document.createElement('img');
    loadingBar.id = 'loadingBar';
    loadingBar.src = icon_loading;
    loadingBar.setAttribute('alt', chrome.i18n.getMessage('loadingBar'));
    pagination_bottom.parentNode.insertBefore(div, pagination_bottom);
    div.appendChild(loadingBar);
    var throttled = _.throttle(function(){
        var nextPageUrl = nextPage.href || nextPage.getAttribute('href');
        $('#loadingBar').toggleClass('isLoading');
        $('#btnLoadMore').toggleClass('isLoading');
        chrome.runtime.sendMessage({
            action: 'GET_NEXT_PAGE',
            data: nextPageUrl
        }, function (response) {
            if (response === 'success') {
                $('#loadingBar').toggleClass('isLoading');
                $('#btnLoadMore').toggleClass('isLoading');
                if (loadedItems >= totalItems) {
                    $('#btnLoadMore').prop('style', 'display:none!important');
                }
            }
        });
    }, 5000, { 'trailing': false });
    $(btnLoadMore).on('click', throttled);

    //$("img.lazy").lazyload();
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg.action) return;
    switch (msg.action) {
        case 'ADD_MORE_ITEMS':
            if (last_item && pagination_bottom) {
                var div = document.createElement('div');
                div.innerHTML = msg.data.list_items;
                var ul_list_items = div.children[0];
                //console.log(ul_list_items);
                $(ul_list_items).find('li.list-item, li.item').each(function (i, li) {
                    if (!li) return;
                    var img = $(li).find('img.picCore')[0];
                    if (img) {
                        var imageSrc = img.src || img.getAttribute('image-src');
                        img.src = icon_loading;
                        var downloadingImage = new Image();
                        downloadingImage.onload = function () {
                            img.src = this.src;
                            img.className += ' pic-Core-v';
                        }
                        downloadingImage.src = imageSrc;
                    }
                    last_item.parentNode.appendChild(li);
                    //loadedItems+=1;
                })
                pagination_bottom.innerHTML = msg.data.pagination_bottom;
                initVars();
                sendResponse('success');
            }
            break;
    }
})