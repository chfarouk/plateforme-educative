FROM python:3.11-slim 
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --compile -r requirements.txt
COPY ./app ./app
COPY run.py .
EXPOSE 5000
CMD [ "python", "run.py" ]