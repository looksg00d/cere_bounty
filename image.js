// image-processor.js

import { existsSync, mkdirSync, writeFile } from "fs";
import { promisify } from "util";
import convert from "heic-convert";
import path from 'path';

export const processImage = async (id, inputBuffer) => {
    try {
        const images = await convert.all({
            buffer: inputBuffer,
            format: "PNG",
        });

        // Создаем директорию для результатов
        const outputDir = path.join(process.cwd(), 'uploads', id);
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        // Сохраняем все изображения
        for (let idx in images) {
            const image = images[idx];
            const outputBuffer = await image.convert();
            await promisify(writeFile)(path.join(outputDir, `${idx}.png`), outputBuffer);
        }

        // Возвращаем путь к первому изображению
        const outputPath = path.join(outputDir, '0.png');
        return {
            path: outputPath,
            success: true
        };
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error('Failed to convert image: ' + error.message);
    }
};
