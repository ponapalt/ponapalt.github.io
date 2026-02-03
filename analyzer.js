// analyzer.js - Common utilities for image analyzers

function setupDropZone(processFile) {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    });
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatHexDump(data) {
    let result = '';
    for (let i = 0; i < data.length; i += 16) {
        const hex = [];
        const ascii = [];
        for (let j = 0; j < 16 && i + j < data.length; j++) {
            const byte = data[i + j];
            hex.push(byte.toString(16).toUpperCase().padStart(2, '0'));
            ascii.push(byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.');
        }
        const offset = i.toString(16).padStart(8, '0').toUpperCase();
        result += `${offset}  ${hex.join(' ').padEnd(48)}  ${ascii.join('')}\n`;
    }
    return result;
}

// EXIF tag name lookup
function getExifTagName(tag) {
    const tags = {
        0x010E: 'ImageDescription', 0x010F: 'Make', 0x0110: 'Model',
        0x0112: 'Orientation', 0x011A: 'XResolution', 0x011B: 'YResolution',
        0x0128: 'ResolutionUnit', 0x0131: 'Software', 0x0132: 'DateTime',
        0x013B: 'Artist', 0x0213: 'YCbCrPositioning',
        0x8298: 'Copyright', 0x8769: 'ExifIFDPointer', 0x8825: 'GPSInfoIFDPointer',
        0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8822: 'ExposureProgram',
        0x8827: 'ISOSpeedRatings', 0x9000: 'ExifVersion',
        0x9003: 'DateTimeOriginal', 0x9004: 'DateTimeDigitized',
        0x9101: 'ComponentsConfiguration', 0x9102: 'CompressedBitsPerPixel',
        0x9201: 'ShutterSpeedValue', 0x9202: 'ApertureValue',
        0x9203: 'BrightnessValue', 0x9204: 'ExposureBiasValue',
        0x9205: 'MaxApertureValue', 0x9206: 'SubjectDistance',
        0x9207: 'MeteringMode', 0x9208: 'LightSource', 0x9209: 'Flash',
        0x920A: 'FocalLength', 0x927C: 'MakerNote', 0x9286: 'UserComment',
        0xA000: 'FlashPixVersion', 0xA001: 'ColorSpace',
        0xA002: 'PixelXDimension', 0xA003: 'PixelYDimension',
        0xA005: 'InteroperabilityIFDPointer',
        0xA20E: 'FocalPlaneXResolution', 0xA20F: 'FocalPlaneYResolution',
        0xA210: 'FocalPlaneResolutionUnit', 0xA217: 'SensingMethod',
        0xA300: 'FileSource', 0xA301: 'SceneType',
        0xA401: 'CustomRendered', 0xA402: 'ExposureMode',
        0xA403: 'WhiteBalance', 0xA404: 'DigitalZoomRatio',
        0xA405: 'FocalLengthIn35mmFilm', 0xA406: 'SceneCaptureType',
        0xA420: 'ImageUniqueID',
        0xA431: 'BodySerialNumber', 0xA432: 'LensSpecification',
        0xA433: 'LensMake', 0xA434: 'LensModel',
        // GPS
        0x0000: 'GPSVersionID', 0x0001: 'GPSLatitudeRef', 0x0002: 'GPSLatitude',
        0x0003: 'GPSLongitudeRef', 0x0004: 'GPSLongitude',
        0x0005: 'GPSAltitudeRef', 0x0006: 'GPSAltitude',
        0x0007: 'GPSTimeStamp', 0x001D: 'GPSDateStamp'
    };
    return tags[tag] || `Tag 0x${tag.toString(16).toUpperCase()}`;
}

function formatExifValue(entry) {
    const val = entry.value;
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'string') return escapeHtml(val);
    if (typeof val === 'object' && val.num !== undefined) {
        return `${val.num}/${val.den} (${val.value.toFixed(6)})`;
    }
    if (Array.isArray(val)) {
        return val.map(v => v.toString()).join(', ');
    }
    return String(val);
}

// Parse EXIF TIFF data. data: Uint8Array starting from TIFF header (byte order mark).
function parseExifData(data) {
    const tiffStart = 0;

    const byteOrder = (data[tiffStart] << 8) | data[tiffStart + 1];
    const littleEndian = byteOrder === 0x4949; // 'II'

    const readU16 = (offset) => {
        if (littleEndian) return data[offset] | (data[offset + 1] << 8);
        return (data[offset] << 8) | data[offset + 1];
    };
    const readU32 = (offset) => {
        if (littleEndian)
            return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
        return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    };
    const readS32 = (offset) => {
        const val = readU32(offset);
        return val > 0x7FFFFFFF ? val - 0x100000000 : val;
    };

    const magic = readU16(tiffStart + 2);
    if (magic !== 42) {
        return { error: 'Invalid TIFF magic number', byteOrder: littleEndian ? 'Little Endian (Intel)' : 'Big Endian (Motorola)' };
    }

    const ifdOffset = readU32(tiffStart + 4);

    const readIFD = (offset) => {
        const absOffset = tiffStart + offset;
        if (absOffset + 2 > data.length) return [];
        const count = readU16(absOffset);
        const entries = [];

        for (let i = 0; i < count; i++) {
            const entryOffset = absOffset + 2 + i * 12;
            if (entryOffset + 12 > data.length) break;

            const tag = readU16(entryOffset);
            const type = readU16(entryOffset + 2);
            const countVal = readU32(entryOffset + 4);
            const valueOffset = entryOffset + 8;

            const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
            const typeSize = typeSizes[type] || 1;
            const totalSize = typeSize * countVal;

            let dataOffset = valueOffset;
            if (totalSize > 4) {
                dataOffset = tiffStart + readU32(valueOffset);
            }

            let value;
            if (type === 2) {
                // ASCII string
                let str = '';
                for (let j = 0; j < countVal - 1 && dataOffset + j < data.length; j++) {
                    str += String.fromCharCode(data[dataOffset + j]);
                }
                value = str;
            } else if (type === 3) {
                // SHORT
                value = countVal === 1 ? readU16(dataOffset) : [];
                if (Array.isArray(value)) {
                    for (let j = 0; j < countVal && j < 10; j++) {
                        value.push(readU16(dataOffset + j * 2));
                    }
                }
            } else if (type === 4) {
                // LONG
                value = countVal === 1 ? readU32(dataOffset) : [];
                if (Array.isArray(value)) {
                    for (let j = 0; j < countVal && j < 10; j++) {
                        value.push(readU32(dataOffset + j * 4));
                    }
                }
            } else if (type === 5) {
                // RATIONAL
                const num = readU32(dataOffset);
                const den = readU32(dataOffset + 4);
                value = { num, den, value: den !== 0 ? num / den : 0 };
            } else if (type === 9) {
                // SLONG
                value = countVal === 1 ? readS32(dataOffset) : readS32(dataOffset);
            } else if (type === 10) {
                // SRATIONAL
                const num = readS32(dataOffset);
                const den = readS32(dataOffset + 4);
                value = { num, den, value: den !== 0 ? num / den : 0 };
            } else if (type === 1 || type === 7) {
                // BYTE / UNDEFINED
                if (countVal <= 4) {
                    value = [];
                    for (let j = 0; j < countVal; j++) value.push(data[dataOffset + j]);
                } else {
                    value = `[${countVal} bytes]`;
                }
            } else {
                value = readU32(dataOffset);
            }

            entries.push({ tag, type, count: countVal, value, tagName: getExifTagName(tag) });
        }

        return entries;
    };

    const ifd0 = readIFD(ifdOffset);

    // Find ExifIFD pointer
    let exifIFDEntries = [];
    let gpsIFDEntries = [];
    const exifIFDPointer = ifd0.find(e => e.tag === 0x8769);
    if (exifIFDPointer) {
        exifIFDEntries = readIFD(exifIFDPointer.value);
    }
    const gpsIFDPointer = ifd0.find(e => e.tag === 0x8825);
    if (gpsIFDPointer) {
        gpsIFDEntries = readIFD(gpsIFDPointer.value);
    }

    return {
        byteOrder: littleEndian ? 'Little Endian (Intel)' : 'Big Endian (Motorola)',
        ifd0, exifIFD: exifIFDEntries, gpsIFD: gpsIFDEntries
    };
}
