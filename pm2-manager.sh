#!/bin/bash

# PM2 Management Script for Telegram Upload File System

case "$1" in
    start)
        echo "Starting Telegram Upload File System..."
        pm2 start ecosystem.config.js
        ;;
    stop)
        echo "Stopping Telegram Upload File System..."
        pm2 stop telegram-upload-file
        ;;
    restart)
        echo "Restarting Telegram Upload File System..."
        pm2 restart telegram-upload-file
        ;;
    status)
        echo "Checking status of Telegram Upload File System..."
        pm2 status telegram-upload-file
        ;;
    logs)
        echo "Showing logs for Telegram Upload File System..."
        pm2 logs telegram-upload-file --lines 50 --nostream
        ;;
    delete)
        echo "Deleting Telegram Upload File System from PM2..."
        pm2 delete telegram-upload-file
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|delete}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the application"
        echo "  stop    - Stop the application"
        echo "  restart - Restart the application"
        echo "  status  - Check application status"
        echo "  logs    - View application logs"
        echo "  delete  - Remove application from PM2"
        exit 1
        ;;
esac
