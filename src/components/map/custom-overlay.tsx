import * as React from 'react';
import { cloneElement, useState } from 'react';
import { useControl } from 'react-map-gl/maplibre';
import { createPortal } from 'react-dom';

import type { MapboxMap } from 'react-map-gl';
import type { IControl } from 'react-map-gl/maplibre';
import { Map } from 'maplibre-gl';

// Based on template in https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
class OverlayControl implements IControl {
    _map: Map = null as any;
    _container: HTMLElement = null as any;
    _redraw: () => void;

    constructor(redraw: () => void) {
        this._redraw = redraw;
    }

    onAdd(map: Map): HTMLElement {
        this._map = map;
        map.on('move', this._redraw);
        /* global document */
        this._container = document.createElement('div');
        this._redraw();
        return this._container;
    }

    onRemove(): void {
        this._container.remove();
        this._map.off('move', this._redraw);
        this._map = null as any;
    }

    getMap() {
        return this._map;
    }

    getElement() {
        return this._container;
    }
}

/**
 * A custom control that rerenders arbitrary React content whenever the camera changes
 */
function CustomOverlay(props: { children: React.ReactElement }) {
    const [, setVersion] = useState(0);

    const ctrl = useControl<OverlayControl>(() => {
        const forceUpdate = () => setVersion(v => v + 1);
        return new OverlayControl(forceUpdate);
    });

    const map = ctrl.getMap();

    return (
        map &&
        createPortal(cloneElement(props.children, { map }), ctrl.getElement())
    );
}

export default React.memo(CustomOverlay);
