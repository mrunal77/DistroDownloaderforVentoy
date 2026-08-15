# Troubleshooting

## App Won't Start

### Symptoms
- App crashes immediately on launch
- "Cannot find module" error
- Blank window with no content

### Solutions

1. **Check Node.js version**: Requires Node.js 18+
   ```bash
   node --version
   ```

2. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for missing build artifacts**:
   ```bash
   npm run build
   ```

4. **Check Electron compatibility**:
   ```bash
   npx electron --version
   ```

5. **GPU issues**: Try disabling hardware acceleration:
   ```bash
   ELECTRON_DISABLE_GPU=1 npm start
   ```

---

## USB Drive Not Detected

### Symptoms
- No drives shown in the app
- Expected USB drive is missing

### Solutions

1. **Verify the drive is connected**:
   ```bash
   lsblk
   ```

2. **Check the drive is USB and removable**:
   ```bash
   udevadm info --query=property --name /dev/sdX | grep ID_BUS
   udevadm info --query=property --name /dev/sdX | grep ID_USB_DRIVER
   ```

3. **Check sysfs removable flag**:
   ```bash
   cat /sys/block/sdX/removable  # Should be "1"
   ```

4. **Check read-only status** — the app skips read-only drives:
   ```bash
   cat /sys/block/sdX/ro  # Should be "0"
   ```

5. **Run diagnostics from the app**: Click the diagnostics button to see detailed drive information.

---

## Ventoy Not Detected

### Symptoms
- USB drive detected but "Ventoy not found"
- Low or no confidence score

### Solutions

1. **Verify Ventoy is installed**:
   ```bash
   ls /media/<user>/Ventoy/ventoy/ventoy.json
   ```

2. **Check partition labels**:
   ```bash
   lsblk -o NAME,LABEL,PARTLABEL,FSTYPE,SIZE
   ```
   - Should see a `ventoy` label on the data partition
   - Should see a `vtoyefi` label on the EFI partition

3. **Check partition structure**:
   - Data partition: >1GB, filesystem exfat/ntfs/fat32/ext4
   - EFI partition: <100MB, filesystem vfat/fat32

4. **Reinstall Ventoy** if the structure is wrong:
   ```bash
   sudo ventoy -i /dev/sdX
   ```

---

## Download Fails

### Symptoms
- "Download failed" error
- Progress bar stalls

### Solutions

1. **Check network connectivity**:
   ```bash
   curl -I https://releases.ubuntu.com/
   ```

2. **Check target mount path exists**:
   ```bash
   ls /media/<user>/Ventoy/
   ```

3. **Check available disk space**:
   ```bash
   df -h /media/<user>/Ventoy/
   ```

4. **Check if mount is writable**:
   ```bash
   touch /media/<user>/Ventoy/.write_test && rm /media/<user>/Ventoy/.write_test
   ```

5. **Try a different mirror**: Some distros have multiple download sources.

6. **Check proxy settings**: If behind a proxy, configure in system settings.

---

## Checksum Verification Fails

### Symptoms
- "Checksum verification failed" error
- Downloaded ISO won't verify

### Solutions

1. **Re-download**: The download may be corrupted. Click retry.

2. **Check disk space**: A full disk can cause truncated downloads.

3. **Check the ISO manually**:
   ```bash
   sha256sum /path/to/downloaded.iso
   # Compare with expected hash from distro website
   ```

4. **Check for interrupted download**: Ensure the `.download` temp file is cleaned up:
   ```bash
   ls /media/<user>/Ventoy/*.download
   ```

---

## Permission Denied Errors

### Symptoms
- "Permission denied" when accessing USB
- "Operation not permitted" errors

### Solutions

1. **Check user is in the `disk` group**:
   ```bash
   groups | grep disk
   # If not: sudo usermod -aG disk $USER
   ```

2. **Check udev rules**:
   ```bash
   ls /etc/udev/rules.d/
   # Look for ventoy or block device rules
   ```

3. **Check mount permissions**:
   ```bash
   ls -la /media/<user>/Ventoy/
   ```

4. **Restart udev after rule changes**:
   ```bash
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```

---

## Mount Issues

### Symptoms
- "Mount path does not exist"
- Drive appears but files are inaccessible

### Solutions

1. **Check if the partition is mounted**:
   ```bash
   mount | grep /dev/sdX
   ```

2. **Manually mount if needed**:
   ```bash
   sudo mount /dev/sdX2 /mnt/ventoy
   ```

3. **Check filesystem type**:
   ```bash
   blkid /dev/sdX2
   ```

4. **Check /etc/fstab** for conflicting entries.

---

## udev Issues

### Symptoms
- USB detection is slow or unreliable
- Drives not appearing when plugged in

### Solutions

1. **Check udev is running**:
   ```bash
   systemctl status udev
   ```

2. **Check udev logs**:
   ```bash
   journalctl -u systemd-udevd --since "10 minutes ago"
   ```

3. **Monitor udev events in real-time**:
   ```bash
   sudo udevadm monitor --environment
   # Then plug/unplug the USB drive
   ```

4. **Check for udev rule conflicts**:
   ```bash
   sudo udevadm test $(udevadm info -q path -n /dev/sdX)
   ```

5. **Trigger a rescan**:
   ```bash
   sudo udevadm trigger --type=devices --action=add
   ```

6. **Restart udev** (may disconnect devices briefly):
   ```bash
   sudo systemctl restart systemd-udevd
   ```

---

## General Debug Steps

1. **Run the app from terminal** to see error output:
   ```bash
   npm start
   ```

2. **Check app logs** (stored in userData directory):
   ```bash
   ls ~/.config/ventoy-linux-distro-downloader/
   ```

3. **Enable verbose logging** in app settings.

4. **Check system logs**:
   ```bash
   journalctl --user -u electron --since "1 hour ago"
   ```
