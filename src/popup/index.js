import './index.css';
import chromeStorage from 'chrome-storage-wrapper';

$('h4').text(chrome.i18n.getMessage('popup_title'));
$('label[for="cfg_auto"]').text(chrome.i18n.getMessage('label_auto'))
$('label[for="cfg_manual"]').text(chrome.i18n.getMessage('label_manual'))

chromeStorage.get(['cfgLoadMore'])
    .then(items => {
        var cfgLoadMore = items.cfgLoadMore || 'manual';
        $('input[value="' + cfgLoadMore + '"]').prop('checked', true);
    });

$('input[name="cfgLoadMore"]').on('change', function () {
    chromeStorage.set('cfgLoadMore',$(this).val());
})