export const html = `<!DOCTYPE html>
<html lang="en" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HEIC to PNG Converter</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        .theme-toggle {
            position: fixed;
            top: 1rem;
            right: 1rem;
        }
        
        html.dark {
            background: #1a1a1a;
            color: #fff;
        }
        
        html.dark .bg-white {
            background-color: #2d2d2d;
        }
        
        html.dark .text-gray-600 {
            color: #a0aec0;
        }
        
        html.dark .text-gray-700 {
            color: #e2e8f0;
        }
        
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }

        .drop-zone-active {
            transform: scale(1.02);
            transition: all 0.2s ease;
        }
    </style>
</head>
<body class="min-h-screen transition-colors duration-200" x-data="{ darkMode: false }">
    <!-- Theme Toggle Button -->
    <button onclick="toggleTheme()" class="theme-toggle p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
        <svg class="w-6 h-6 hidden dark:block text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
        <svg class="w-6 h-6 block dark:hidden text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
        </svg>
    </button>

    <div class="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div class="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 transition-colors duration-200">
            <h1 class="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-slate-50">HEIC to PNG Converter</h1>
            
            <!-- Upload Zone -->
            <div id="drop-zone" class="border-3 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center mb-6 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-pointer">
                <input type="file" id="file-input" accept=".heic,.HEIC" class="hidden" multiple>
                <div class="space-y-4">
                    <svg class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="text-gray-600 dark:text-gray-400">
                        <p class="text-lg mb-2">Drag and drop HEIC files here</p>
                        <p class="text-sm">or</p>
                        <button class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200" onclick="document.getElementById('file-input').click()">
                            Browse Files
                        </button>
                    </div>
                </div>
            </div>

            <!-- Progress Area -->
            <div id="progress-area" class="space-y-4 hidden">
                <div class="flex items-center justify-between">
                    <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Converting files...</div>
                    <div class="text-sm font-medium text-blue-500" id="progress-text">0%</div>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div id="progress-bar" class="bg-blue-500 h-2.5 rounded-full transition-all duration-200" style="width: 0%"></div>
                </div>
            </div>

            <!-- Results Area -->
            <div id="results" class="space-y-4 mt-6"></div>
        </div>
    </div>

    <script>
        // Theme toggle functionality
        function toggleTheme() {
            const html = document.documentElement;
            html.classList.toggle('dark');
            localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
        }

        // Load saved theme
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }

        // Existing JavaScript
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const progressArea = document.getElementById('progress-area');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const results = document.getElementById('results');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropZone.classList.add('drop-zone-active', 'border-blue-500', 'dark:border-blue-400');
        }

        function unhighlight(e) {
            dropZone.classList.remove('drop-zone-active', 'border-blue-500', 'dark:border-blue-400');
        }

        dropZone.addEventListener('drop', handleDrop, false);
        fileInput.addEventListener('change', handleFiles, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles({ target: { files } });
        }

        async function handleFiles(e) {
            const files = [...e.target.files];
            if (files.length === 0) return;

            progressArea.classList.remove('hidden');
            results.innerHTML = '';
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.name.toLowerCase().endsWith('.heic')) {
                    showError(\`\${file.name} is not a HEIC file\`);
                    continue;
                }

                try {
                    const formData = new FormData();
                    formData.append('heic', file);

                    const response = await fetch('/convert', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error('Conversion failed');

                    const data = await response.json();
                    showSuccess(file.name, data.url);
                } catch (error) {
                    showError(\`Failed to convert \${file.name}: \${error.message}\`);
                }

                const progress = Math.round(((i + 1) / files.length) * 100);
                progressBar.style.width = \`\${progress}%\`;
                progressText.textContent = \`\${progress}%\`;
            }

            setTimeout(() => {
                progressArea.classList.add('hidden');
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
            }, 2000);
        }

        function showSuccess(fileName, url) {
            const result = document.createElement('div');
            result.className = 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between transition-colors duration-200';
            result.innerHTML = \`
                <div class="flex items-center">
                    <svg class="h-5 w-5 text-green-500 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span class="text-sm text-gray-700 dark:text-gray-300">\${fileName} converted successfully</span>
                </div>
                <a href="\${url}" download class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200">Download PNG</a>
            \`;
            results.appendChild(result);
        }

        function showError(message) {
            const error = document.createElement('div');
            error.className = 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center transition-colors duration-200';
            error.innerHTML = \`
                <svg class="h-5 w-5 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span class="text-sm text-gray-700 dark:text-gray-300">\${message}</span>
            \`;
            results.appendChild(error);
        }
    </script>
</body>
</html>`; 