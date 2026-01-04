import { Injectable } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Result } from '@zxing/library';

@Injectable({
  providedIn: 'root',
})
export class QRScannerService {
  private readonly codeReader = new BrowserMultiFormatReader();

  private controls: IScannerControls | null = null;
  private stream: MediaStream | null = null;
  private isScanning = false;

  /**
   * Start scanning QR codes from device camera
   */
  async startScanning(
    videoElement: HTMLVideoElement,
    onScan: (resultText: string) => void,
    onError: (error: unknown) => void
  ): Promise<void> {
    try {
      if (!videoElement) {
        throw new Error('Video element is required');
      }

      // Stop any existing session first
      this.stopScanning();

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!videoInputDevices.length) {
        throw new Error('No camera found on this device');
      }

      // Prefer back camera on mobile devices (best-effort)
      const backCamera = videoInputDevices.find((device: MediaDeviceInfo) => {
        const label = (device.label || '').toLowerCase();
        return (
          label.includes('back') ||
          label.includes('rear') ||
          label.includes('environment')
        );
      });

      const selectedDevice = backCamera ?? videoInputDevices[0];

      this.isScanning = true;

      // decodeFromVideoDevice returns controls in many @zxing/browser versions
      this.controls = await this.codeReader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoElement,
        (result?: Result, error?: unknown) => {
          if (!this.isScanning) return;

          if (result) {
            onScan(result.getText());
            return;
          }

          // Ignore the common "not found" noise (no QR in frame)
          if (error && !this.isNonCriticalDecodeError(error)) {
            onError(error);
          }
        }
      );

      // Store stream for cleanup
      this.stream = videoElement.srcObject as MediaStream | null;
    } catch (error) {
      this.isScanning = false;
      onError(error);
    }
  }

  /**
   * Stop scanning and release camera
   */
  stopScanning(): void {
    this.isScanning = false;

    // Stop decoding loop
    this.controls?.stop();
    this.controls = null;

    // Stop camera tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /**
   * Check if device has camera
   */
  async hasCameraSupport(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return false;
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((device) => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  /**
   * Request camera permission (prompts the user)
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return false;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  private isNonCriticalDecodeError(error: unknown): boolean {
    if (!error) return false;
    const err = error as { name?: string; message?: string };
    const name = (err?.name ?? '').toLowerCase();
    const message = (err?.message ?? '').toLowerCase();

    if (!name && !message) {
      return false;
    }

    if (name.includes('notfound')) {
      return true;
    }

    return (
      message.includes('no multiformat readers') ||
      message.includes('not find code') ||
      message.includes('qr code not found') ||
      message.includes('no code found') ||
      message.includes('checksumexception')
    );
  }
}
