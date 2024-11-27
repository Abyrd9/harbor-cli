VERSION := 0.1.0
BINARY_NAME := harbor
BUILD_FLAGS := -ldflags "-X main.version=${VERSION}"

.PHONY: build install clean

build:
	go build ${BUILD_FLAGS} -o ${BINARY_NAME}

install:
	go install ${BUILD_FLAGS}

clean:
	rm -f ${BINARY_NAME}