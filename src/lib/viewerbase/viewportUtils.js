import $ from 'jquery';
import _ from 'underscore';
import { cornerstone, cornerstoneTools } from '../cornerstonejs';
import { DCMViewerManager } from '../DCMViewerManager';
import { DCMViewerLog } from '../DCMViewerLog';
import { updateOrientationMarkers } from './updateOrientationMarkers';
import { getInstanceClassDefaultViewport } from './instanceClassSpecificViewport';
import { DCMViewer } from '../viewerMain';
import { captureImageDialog } from './captureImageDialog';

/**
 * Get a cornerstone enabledElement for a DOM Element
 * @param  {DOMElement} element Element to get the enabledElement from Cornerstone
 * @return {Object}             Cornerstone's enabledElement object for the given
 *                              element or undefined if the element is not enabled
 */
const getEnabledElement = (element) => {
    let enabledElement;

    try {
        enabledElement = cornerstone.getEnabledElement(element);
    } catch (error) {
        DCMViewerLog.warn(error);
    }

    return enabledElement;
};

/**
 * Get the active viewport element. It uses activeViewport Session Variable
 * @return {DOMElement} DOMElement of the current active viewport
 */
const getActiveViewportElement = () => {
    const viewportIndex = DCMViewerManager.sessions.activeViewport || 0;
    return $('.imageViewerViewport').get(viewportIndex);
};

/**
 * Get a cornerstone enabledElement for the Active Viewport Element
 * @return {Object}  Cornerstone's enabledElement object for the active
 *                   viewport element or undefined if the element
 *                   is not enabled
 */
const getEnabledElementForActiveElement = () => {
    const activeViewportElement = getActiveViewportElement();
    const enabledElement = getEnabledElement(activeViewportElement);

    return enabledElement;
};

const getAnnotationTools = () => ['length', 'probe', 'simpleAngle', 'arrowAnnotate', 'ellipticalRoi', 'rectangleRoi'];

const toggleAnnotations = (viewportElement, toggle) => {
    const action = toggle ? 'enable' : 'disable';
    const annotationTools = getAnnotationTools();
    annotationTools.forEach(tool => cornerstoneTools[tool][action](viewportElement));
};

const zoomIn = () => {
    const element = getActiveViewportElement();
    if (!element) {
        return;
    }

    const viewport = cornerstone.getViewport(element);
    const scaleIncrement = 0.15;
    const maximumScale = 10;
    viewport.scale = Math.min(viewport.scale + scaleIncrement, maximumScale);
    cornerstone.setViewport(element, viewport);
};

const zoomOut = () => {
    const element = getActiveViewportElement();
    if (!element) {
        return;
    }

    const viewport = cornerstone.getViewport(element);
    const scaleIncrement = 0.15;
    const minimumScale = 0.05;
    viewport.scale = Math.max(viewport.scale - scaleIncrement, minimumScale);
    cornerstone.setViewport(element, viewport);
};

const zoomToFit = () => {
    const element = getActiveViewportElement();
    if (!element) {
        return;
    }

    cornerstone.fitToWindow(element);
};

const rotateL = () => {
    const element = getActiveViewportElement();
    if (!element) {
        return;
    }

    const viewport = cornerstone.getViewport(element);
    viewport.rotation -= 90;
    cornerstone.setViewport(element, viewport);
    updateOrientationMarkers(element, viewport);
};

const rotateR = () => {
    const element = getActiveViewportElement();
    if (!element) {
        return;
    }

    const viewport = cornerstone.getViewport(element);
    viewport.rotation += 90;
    cornerstone.setViewport(element, viewport);
    updateOrientationMarkers(element, viewport);
};

const invert = () => {
    const element = getActiveViewportElement();
    if (!element) {
        return;
    }

    const viewport = cornerstone.getViewport(element);
    viewport.invert = (viewport.invert === false);
    cornerstone.setViewport(element, viewport);
};

const flipV = () => {
    const element = getActiveViewportElement();
    const viewport = cornerstone.getViewport(element);
    viewport.vflip = (viewport.vflip === false);
    cornerstone.setViewport(element, viewport);
    updateOrientationMarkers(element, viewport);
};

const flipH = () => {
    const element = getActiveViewportElement();
    const viewport = cornerstone.getViewport(element);
    viewport.hflip = (viewport.hflip === false);
    cornerstone.setViewport(element, viewport);
    updateOrientationMarkers(element, viewport);
};

const resetViewportWithElement = (element) => {
    const viewport = cornerstone.getViewport(element);
    const enabledElement = cornerstone.getEnabledElement(element);
    if (enabledElement.fitToWindow === false) {
        const { imageId } = enabledElement.image;
        const instance = cornerstone.metaData.get('instance', imageId);

        enabledElement.viewport = cornerstone.getDefaultViewport(enabledElement.canvas, enabledElement.image);

        const instanceClassDefaultViewport = getInstanceClassDefaultViewport(instance, enabledElement, imageId);
        cornerstone.setViewport(element, instanceClassDefaultViewport);
    } else {
        cornerstone.reset(element);
    }

    updateOrientationMarkers(element, viewport);
};

const resetViewport = (viewportIndex = null) => {
    if (viewportIndex === null) {
        resetViewportWithElement(getActiveViewportElement());
    } else if (viewportIndex === 'all') {
        $('.imageViewerViewport').each((index, element) => {
            resetViewportWithElement(element);
        });
    } else {
        resetViewportWithElement($('.imageViewerViewport').get(viewportIndex));
    }
};

const clearTools = () => {
    const element = getActiveViewportElement();
    const toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;
    toolStateManager.clear(element);
    cornerstone.updateImage(element);
};

const toggleCaptureImageDialog = () => {
    captureImageDialog.show();
};

const linkStackScroll = () => {
    const synchronizer = DCMViewerManager.stackImagePositionOffsetSynchronizer;

    if (!synchronizer) {
        return;
    }

    if (synchronizer.isActive()) {
        synchronizer.deactivate();
    } else {
        synchronizer.activate();
    }
};

// This function was originally defined alone inside client/lib/toggleDialog.js
// and has been moved here to avoid circular dependency issues.
const toggleDialog = (element, closeAction) => {
    const $element = $(element);
    if ($element.is('dialog')) {
        if (element.hasAttribute('open')) {
            if (closeAction) {
                closeAction();
            }

            element.close();
        } else {
            element.show();
        }
    } else {
        const isClosed = $element.hasClass('dialog-open');
        $element.toggleClass('dialog-closed', isClosed);
        $element.toggleClass('dialog-open', !isClosed);
    }
};

// Check if the clip is playing on the active viewport
const isPlaying = () => {
    // Create a dependency on LayoutManagerUpdated and UpdateCINE session
    // DCMViewerManager.sessions.UpdateCINE;
    // DCMViewerManager.sessions.LayoutManagerUpdated;

    // Get the viewport element and its current playClip tool state
    const element = getActiveViewportElement();
    // Empty Elements throws cornerstore exception
    if (!element || !$(element).find('canvas').length) {
        return;
    }

    const toolState = cornerstoneTools.getToolState(element, 'playClip');

    // Stop here if the tool state is not defined yet
    if (!toolState) {
        return false;
    }

    // Get the clip state
    const clipState = toolState.data[0];

    if (clipState) {
        // Return true if the clip is playing
        return !_.isUndefined(clipState.intervalId);
    }

    return false;
};

// Toggle the play/stop state for the cornerstone clip tool
const toggleCinePlay = () => {
    // Get the active viewport element
    const element = getActiveViewportElement();

    // Check if it's playing the clip to toggle it
    if (isPlaying()) {
        cornerstoneTools.stopClip(element);
    } else {
        cornerstoneTools.playClip(element);
    }

    // Update the UpdateCINE session property
    DCMViewerManager.sessions.UpdateCINE = Math.random();
};

// Stop clips on all non-empty elements
const stopAllClips = () => {
    const elements = $('.imageViewerViewport').not('.empty');
    elements.each((index, element) => {
        if ($(element).find('canvas').length) {
            cornerstoneTools.stopClip(element);
        }
    });
};

// Show/hide the CINE dialog
const toggleCineDialog = () => {
    const dialog = document.getElementById('cineDialog');

    toggleDialog(dialog, stopAllClips);
    DCMViewerManager.sessions.UpdateCINE = Math.random();
};

const stopActiveClip = () => {
    const activeElement = getActiveViewportElement();

    if ($(activeElement).find('canvas').length) {
        cornerstoneTools.stopClip(activeElement);
    }
};

const toggleDownloadDialog = () => {
    stopActiveClip();
    const $dialog = $('#imageDownloadDialog');
    if ($dialog.length) {
        $dialog.find('.close:first').click();
    } else {
        DCMViewer.ui.showDialog('imageDownloadDialog');
    }
};

const isDownloadEnabled = () => {
    const activeViewport = getActiveViewportElement();

    return !!activeViewport;
};

// Check if a study has multiple frames
const hasMultipleFrames = () => {
    // Its called everytime active viewport and/or layout change
    // DCMViewerManager.sessions.activeViewport;
    // DCMViewerManager.sessions.LayoutManagerUpdated;

    const activeViewport = getActiveViewportElement();

    // No active viewport yet: disable button
    if (!activeViewport || !$(activeViewport).find('canvas').length) {
        return true;
    }

    // Get images in the stack
    const stackToolData = cornerstoneTools.getToolState(activeViewport, 'stack');

    // No images in the stack, so disable button
    if (!stackToolData || !stackToolData.data || !stackToolData.data.length) {
        return true;
    }

    // Get number of images in the stack
    const stackData = stackToolData.data[0];
    const nImages = stackData.imageIds && stackData.imageIds.length ? stackData.imageIds.length : 1;

    // Stack has just one image, so disable button
    if (nImages === 1) {
        return true;
    }

    return false;
};

const isStackScrollLinkingDisabled = () => {
    let linkableViewportsCount = 0;

    // Its called everytime active viewport and/or layout change
    // DCMViewerManager.sessions.viewportActivated;
    // DCMViewerManager.sessions.LayoutManagerUpdated;

    const synchronizer = DCMViewerManager.stackImagePositionOffsetSynchronizer;
    if (synchronizer) {
        const linkableViewports = synchronizer.getLinkableViewports();
        linkableViewportsCount = linkableViewports.length;
    }

    return linkableViewportsCount <= 1;
};

const isStackScrollLinkingActive = () => {
    let isActive = true;

    // Its called everytime active viewport layout changes
    // DCMViewerManager.sessions.LayoutManagerUpdated;

    const synchronizer = DCMViewerManager.stackImagePositionOffsetSynchronizer;
    const syncedElements = _.pluck(synchronizer.syncedViewports, 'element');
    const $renderedViewports = $('.imageViewerViewport');
    $renderedViewports.each((index, element) => {
        if (!_.contains(syncedElements, element)) {
            isActive = false;
        }
    });

    return isActive;
};

// Create an event listener to update playing state when a clip stops playing
window.addEventListener('cornerstonetoolsclipstopped', () => {
    // TODO: Add handler for session
    // DCMViewerManager.sessions.UpdateCINE = Math.random();
});

/**
 * Export functions inside viewportUtils namespace.
 */

const viewportUtils = {
    getEnabledElementForActiveElement,
    getEnabledElement,
    getActiveViewportElement,
    zoomIn,
    zoomOut,
    zoomToFit,
    rotateL,
    rotateR,
    invert,
    flipV,
    flipH,
    resetViewport,
    clearTools,
    linkStackScroll,
    toggleAnnotations,
    toggleCaptureImageDialog,
    toggleDialog,
    toggleCinePlay,
    toggleCineDialog,
    toggleDownloadDialog,
    isPlaying,
    isDownloadEnabled,
    hasMultipleFrames,
    stopAllClips,
    isStackScrollLinkingDisabled,
    isStackScrollLinkingActive
};

export { viewportUtils };
