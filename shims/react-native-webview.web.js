import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const WebViewComponent = forwardRef((props, ref) => {
  const iframeRef = useRef(null);
  const messageQueue = useRef([]);
  const isReady = useRef(false);

  useImperativeHandle(ref, () => ({
    injectJavaScript: (script) => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) {
        return;
      }
      
      if (!isReady.current) {
        // Queue the script to run after iframe is ready
        const checkAndRun = () => {
          if (isReady.current && iframeRef.current?.contentWindow) {
            try {
              iframeRef.current.contentWindow.eval(`(function() { ${script} })();`);
            } catch (error) {
              console.error('[WebView] Failed to inject queued JavaScript:', error);
            }
          } else {
            setTimeout(checkAndRun, 50);
          }
        };
        checkAndRun();
        return;
      }
      
      try {
        // Wrap in IIFE to avoid scope issues
        iframeRef.current.contentWindow.eval(`(function() { ${script} })();`);
      } catch (error) {
        console.error('[WebView] Failed to inject JavaScript:', error, 'Script:', script);
      }
    },
    goBack: () => {
      if (iframeRef.current?.contentWindow?.history) {
        iframeRef.current.contentWindow.history.back();
      }
    },
    goForward: () => {
      if (iframeRef.current?.contentWindow?.history) {
        iframeRef.current.contentWindow.history.forward();
      }
    },
    reload: () => {
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    },
    stopLoading: () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.stop?.();
      }
    },
    postMessage: (data) => {
      if (iframeRef.current?.contentWindow && isReady.current) {
        iframeRef.current.contentWindow.postMessage(data, '*');
      } else {
        messageQueue.current.push(data);
      }
    },
  }), []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Listen for messages from iframe
    const handleMessage = (event) => {
      if (event.data?.type === 'iframe-message') {
        props.onMessage?.({
          nativeEvent: {
            data: typeof event.data.data === 'string' ? event.data.data : JSON.stringify(event.data.data),
          },
        });
      }
    };
    
    window.addEventListener('message', handleMessage);

    const handleLoad = () => {
      isReady.current = true;

      // Inject ReactNativeWebView bridge (fallback if not in HTML)
      try {
        if (iframe.contentWindow && !iframe.contentWindow.ReactNativeWebView) {
          iframe.contentWindow.ReactNativeWebView = {
            postMessage: (data) => {
              props.onMessage?.({
                nativeEvent: {
                  data: typeof data === 'string' ? data : JSON.stringify(data),
                },
              });
            },
          };
        }
      } catch (error) {
        console.error('[WebView] Failed to inject ReactNativeWebView:', error);
      }

      // Flush queued messages
      if (messageQueue.current.length > 0) {
        messageQueue.current.forEach(msg => {
          try {
            iframe.contentWindow?.postMessage(msg, '*');
          } catch (error) {
            console.warn('[WebView] Failed to post message:', error);
          }
        });
        messageQueue.current = [];
      }

      // Set up message listener in iframe (legacy support)
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            props.onMessage?.({
              nativeEvent: {
                data: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
              },
            });
          });
        }
      } catch (error) {
        console.warn('[WebView] Failed to set up message listener:', error);
      }

      props.onLoadEnd?.();
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      window.removeEventListener('message', handleMessage);
    };
  }, [props]);

  const iframeStyle = {
    border: 'none',
    width: '100%',
    height: '100%',
    ...props.style,
  };

  // If source is HTML, use blob URL
  if (props.source?.html) {
    // Inject base tag to allow relative URLs to work from blob
    const baseUrl = window.location.origin + '/';
    let htmlWithBase = props.source.html;
    
    // Add base tag after <head> if it exists, or at the start of HTML
    if (htmlWithBase.includes('<head>')) {
      htmlWithBase = htmlWithBase.replace('<head>', `<head><base href="${baseUrl}">`);
    } else if (htmlWithBase.includes('<html>')) {
      htmlWithBase = htmlWithBase.replace('<html>', `<html><head><base href="${baseUrl}"></head>`);
    } else {
      htmlWithBase = `<base href="${baseUrl}">` + htmlWithBase;
    }
    
    const blob = new Blob([htmlWithBase], { type: 'text/html' });
    const objectUrl = URL.createObjectURL(blob);
    
    useEffect(() => {
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [objectUrl]);

    return React.createElement('iframe', {
      ref: iframeRef,
      style: iframeStyle,
      src: objectUrl,
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-modals',
      allow: '*',
      title: 'webview',
    });
  }

  // If source is a URI
  if (props.source?.uri) {
    return React.createElement('iframe', {
      ref: iframeRef,
      style: iframeStyle,
      src: props.source.uri,
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-modals',
      allow: '*',
      title: 'webview',
    });
  }

  // Empty WebView
  return React.createElement('iframe', {
    ref: iframeRef,
    style: iframeStyle,
    sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-modals',
    allow: '*',
    title: 'webview',
    srcDoc: '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>',
  });
});

WebViewComponent.displayName = 'WebView';

// Export both as default and named export
export default WebViewComponent;
export { WebViewComponent as WebView };
