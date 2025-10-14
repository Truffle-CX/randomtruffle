import setuptools

setuptools.setup(
    name='meta-audience-uploader',
    version='1.0',
    install_requires=[
        'requests>=2.20.0', # O la versión que necesites
        'google-cloud-secret-manager>=2.0.0' # O la versión que necesites
        # apache-beam[gcp] se maneja por el runner, usualmente no se pone aquí
    ],
    packages=setuptools.find_packages(),
)