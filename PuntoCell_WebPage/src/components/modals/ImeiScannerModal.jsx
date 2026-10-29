import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Alert } from '@mui/material';

export default function ImeiScannerModal({ open, onClose, onScanSuccess }) {
  const videoRef = useRef(null);
  const [errorCamara, setErrorCamara] = useState('');
  
  const aciertosRef = useRef(0);
  const ultimoCodigoRef = useRef('');
  const escaneandoRef = useRef(false);

  const reproducirPitido = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle'; // Un tono más penetrante y rápido
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (error) {}
  };

  useEffect(() => {
    let streamLocal = null;
    let requestAnimFrameId = null;

    const iniciarCamara = async () => {
      try {
        setErrorCamara('');
        aciertosRef.current = 0;
        ultimoCodigoRef.current = '';
        escaneandoRef.current = true;

        // 1. Verificamos si el navegador tiene el motor nativo de Machine Learning
        if (!('BarcodeDetector' in window)) {
          setErrorCamara('Tu navegador no soporta escaneo acelerado por hardware. Por favor, usa Google Chrome o Microsoft Edge.');
          return;
        }

        // 2. Instanciamos el detector nativo del navegador (ultra rápido)
        const barcodeDetector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'itf']
        });

        // 3. Encendemos la cámara frontal
        streamLocal = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = streamLocal;
          
          // 4. Bucle de escaneo nativo
          const procesarFrame = async () => {
            if (!escaneandoRef.current || !videoRef.current) return;

            // Verificamos que el video tenga datos suficientes para analizar
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                // El detector nativo busca directamente en la etiqueta de video, sin canvas ni filtros
                const codigos = await barcodeDetector.detect(videoRef.current);
                
                if (codigos.length > 0) {
                  const codigoActual = codigos[0].rawValue;
                  
                  // Validamos longitud mínima
                  if (codigoActual.length >= 10) {
                    if (codigoActual === ultimoCodigoRef.current) {
                      aciertosRef.current += 1;
                    } else {
                      ultimoCodigoRef.current = codigoActual;
                      aciertosRef.current = 1;
                    }

                    // Confirmación doble
                    if (aciertosRef.current >= 2) {
                      reproducirPitido();
                      const imeiLimpio = codigoActual.replace(/\D/g, '');
                      escaneandoRef.current = false;
                      onScanSuccess(imeiLimpio);
                      onClose();
                      return;
                    }
                  }
                }
              } catch (err) {
                // Fallos silenciosos de lectura (normales)
              }
            }
            
            // Usamos la API nativa de animaciones para que sincronice perfecto con los fotogramas (60fps)
            if (escaneandoRef.current) {
              requestAnimFrameId = requestAnimationFrame(procesarFrame);
            }
          };

          videoRef.current.onplaying = () => procesarFrame();
        }
      } catch (err) {
        setErrorCamara('Error al conectar con la cámara: ' + (err.message || err));
      }
    };

    if (open) iniciarCamara();

    return () => {
      escaneandoRef.current = false;
      if (requestAnimFrameId) cancelAnimationFrame(requestAnimFrameId);
      if (streamLocal) streamLocal.getTracks().forEach(track => track.stop());
    };
  }, [open, onClose, onScanSuccess]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight="bold">Escanear Código IMEI</DialogTitle>
      
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          <strong>Modo IA Nativo:</strong> Muestra el código en la cámara.
        </Typography>

        {errorCamara && <Alert severity="error">{errorCamara}</Alert>}

        <Box sx={{ width: '100%', maxWidth: 400, position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: 'black', boxShadow: 3 }}>
          {/* Mostramos el video crudo. El motor nativo no necesita zoom ni blanco y negro. */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', display: 'block', objectFit: 'cover', minHeight: '250px' }} 
          />
          
          <Box 
            sx={{
              position: 'absolute', top: '50%', left: '10%', right: '10%', height: 2, 
              bgcolor: 'success.main', boxShadow: '0 0 10px #4caf50', zIndex: 10,
              transform: 'translateY(-50%)'
            }} 
          />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}